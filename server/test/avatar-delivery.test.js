const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const sharp = require('sharp');

process.env.JWT_SECRET = 'synthetic-local-avatar-delivery-fixture-key';
require.cache[require.resolve('dotenv')] = { loaded: true, exports: { config() {} } };
const avatars = new Map();
let queryHook, activeReads = 0, peakReads = 0;
let readIds = [];
require.cache[require.resolve('../db')] = { loaded: true, exports: { getPool: () => ({
  query: async (sql, values) => {
    assert.equal(sql, 'SELECT avatar FROM users WHERE id = ? LIMIT 1');
    const id = Number(values[0]);
    readIds.push(id); activeReads += 1; peakReads = Math.max(peakReads, activeReads);
    try {
      if (queryHook) await queryHook(id);
      return [[{ avatar: avatars.get(id) || '' }]];
    } finally { activeReads -= 1; }
  }
}) } };
require.cache[require.resolve('../services/profile-storage')] = { loaded: true, exports: {
  readProfile: async () => null, syncUserProfileFromDatabase: async () => null,
  updateUserProfile: async () => null, publicProfile: value => value
} };

let server, base;
const arrivals = new Map();
const arrivalWaiters = new Map();
function arrived(id) {
  const url = `/api/auth/avatar/${id}`;
  if (arrivals.has(url)) return Promise.resolve(arrivals.get(url));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request did not arrive: ${id}`)), 3000);
    arrivalWaiters.set(url, value => { clearTimeout(timer); resolve(value); });
  });
}
function start(id) {
  let client;
  const result = new Promise(resolve => {
    client = http.get(`${base}/api/auth/avatar/${id}`, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    client.on('error', () => resolve({ status: 'cancelled' }));
  });
  return { client, result };
}

before(async () => {
  for (let id = 1; id <= 70; id += 1) {
    const png = await sharp({ create: { width: 96, height: 96, channels: 3,
      background: { r: id * 5 % 256, g: id * 11 % 256, b: id * 17 % 256 } } }).png().toBuffer();
    avatars.set(id, `data:image/png;base64,${png.toString('base64')}`);
  }
  const app = express();
  app.use('/api/auth', require('../routes/auth'));
  server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  server.on('request', (req, res) => {
    const record = { req, res };
    const url = req.originalUrl || req.url;
    arrivals.set(url, record);
    if (arrivalWaiters.has(url)) { arrivalWaiters.get(url)(record); arrivalWaiters.delete(url); }
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

test('50 ordinary distinct avatars all load through actual HTTP with bounded reads', async () => {
  const results = await Promise.all(Array.from({ length: 50 }, (_, index) => start(index + 1).result));
  assert.equal(results.filter(result => result.status === 200).length, 50);
  assert.equal(peakReads <= 2, true);
  for (const result of results) {
    assert.equal(result.headers['content-type'], 'image/webp');
    assert.ok(result.body.length <= 64 * 1024);
    assert.equal((await sharp(result.body).metadata()).format, 'webp');
  }
  assert.equal((await start(99999).result).status, 404);
  assert.equal((await start('invalid').result).status, 400);
  console.log('Local ordinary avatar burst: 50/50 HTTP 200; at most two DB/image delivery workers');
});

test('delivery has finite admission, releases cancelled pending requests, and bounds cancelled active reads', { timeout: 20000 }, async () => {
  arrivals.clear(); readIds = []; peakReads = 0;
  let releaseFirst, releaseSecond;
  const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
  const secondBlocked = new Promise(resolve => { releaseSecond = resolve; });
  queryHook = async id => { if (id === 1) await firstBlocked; if (id === 2) await secondBlocked; };
  const clients = [];
  try {
    clients.push(start(1), start(2));
    await Promise.all([arrived(1), arrived(2)]);
    for (let id = 3; id <= 66; id += 1) clients.push(start(id));
    await Promise.all(Array.from({ length: 64 }, (_, index) => arrived(index + 3)));
    assert.deepEqual([...readIds].sort((a, b) => a - b), [1, 2]); // Pending contexts have not fetched any data URL.
    const overflow = await start(67).result;
    assert.equal(overflow.status, 429);
    assert.equal(overflow.headers['retry-after'], '1');
    const pendingClosed = new Promise(resolve => arrivals.get('/api/auth/avatar/3').res.once('close', resolve));
    clients[2].client.destroy(); await pendingClosed;
    const replacement = start(68); clients.push(replacement);
    await arrived(68);
    assert.deepEqual([...readIds].sort((a, b) => a - b), [1, 2]);
    const activeClosed = new Promise(resolve => arrivals.get('/api/auth/avatar/1').res.once('close', resolve));
    clients[0].client.destroy(); await activeClosed;
    assert.deepEqual([...readIds].sort((a, b) => a - b), [1, 2]); // Disconnect does not admit a third still-active DB read.
    releaseFirst(); releaseSecond();
    const results = await Promise.all(clients.map(client => client.result));
    assert.equal(results.filter(result => result.status === 'cancelled').length, 2);
    assert.equal(results.filter(result => result.status === 200).length, 65);
    assert.equal(readIds.includes(3), false);
    assert.equal(readIds.includes(68), true);
    assert.equal(peakReads <= 2, true);
    assert.equal((await start(69).result).status, 200);
  } finally {
    releaseFirst(); releaseSecond(); queryHook = null;
    for (const client of clients) client.client.destroy();
  }
});
