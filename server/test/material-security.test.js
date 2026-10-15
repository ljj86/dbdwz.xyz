const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');

const workspace = process.env.TEST_WORKSPACE_ROOT || os.tmpdir();
let root;
let storage;
let previews;
let server;
let origin;
const materials = [];
const files = [];
const pool = {
  async getConnection() {
    return { beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {}, query: async () => { throw new Error('Cancelled upload must not write database rows'); } };
  },
  async query(sql, args = []) {
    if (sql.includes('SELECT id, folder, user_id FROM meeting_materials')) return [materials];
    if (sql.includes('SELECT m.id, m.folder, m.tester_only, f.filename')) {
      const material = materials.find(row => row.folder === args[0] && row.is_published);
      return [material ? files.filter(file => file.material_id === material.id).map(file => ({ ...material, filename: file.filename })) : []];
    }
    if (sql.includes('SELECT m.folder, f.filename, f.file_size')) {
      const material = materials.find(row => row.id === args[0] && row.is_published && (!row.tester_only || args[2]));
      return [material ? files.filter(file => file.material_id === material.id && file.filename === args[1]).map(file => ({ ...file, folder: material.folder })) : []];
    }
    throw new Error(`Unexpected synthetic query: ${sql}`);
  }
};
function request(target, user = 'user') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(origin);
    const req = http.get({ hostname: parsed.hostname, port: parsed.port, path: target, headers: user ? { 'x-test-role': user } : {} }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
  });
}
async function addMaterial(userId, folder, names, testerOnly = false) {
  const material = { id: materials.length + 1, user_id: userId, folder, tester_only: testerOnly ? 1 : 0, is_published: 1 };
  materials.push(material);
  await fs.mkdir(path.join(storage.resourceRoot, folder), { recursive: true });
  for (const name of names) {
    await fs.writeFile(path.join(storage.resourceRoot, folder, name), name.endsWith('.html') ? '<h1>Meeting report</h1><script>parent.localStorage.pwned=1</script>' : 'fixture');
    files.push({ material_id: material.id, filename: name, file_size: 100 });
  }
  return material;
}
test.before(async () => {
  root = await fs.mkdtemp(path.join(workspace, 'material-security-'));
  process.env.TMPDIR = root;
  process.env.RESOURCE_ROOT = path.join(root, 'resources');
  process.env.PROFILE_ROOT = path.join(root, 'profiles');
  process.env.MATERIAL_STAGING_ROOT = path.join(root, 'staging');
  process.env.MATERIAL_MIN_FREE_BYTES = '1048576';
  const dbPath = require.resolve('../db');
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPool: () => pool } };
  const authPath = require.resolve('../middleware/auth');
  const gate = (req, res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.sendStatus(401);
    req.user = { id: 1, role, username: 'synthetic' };
    next();
  };
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { authMiddleware: gate } };
  const profilePath = require.resolve('../services/profile-storage');
  require.cache[profilePath] = { id: profilePath, filename: profilePath, loaded: true, exports: {
    PROFILE_ROOT: process.env.PROFILE_ROOT,
    deletedDirectory: userId => path.join(process.env.PROFILE_ROOT, `user-${userId}`, 'deleted'),
    ensureUserDirectories: async userId => { await fs.mkdir(path.join(process.env.PROFILE_ROOT, `user-${userId}`, 'deleted'), { recursive: true }); }
  } };
  storage = require('../services/upload-storage');
  previews = require('../services/preview-storage');
  const express = require('express');
  const { materialFiles } = require('../middleware/material-files');
  const app = express();
  app.use(express.json());
  app.use('/materials-files', gate, materialFiles);
  app.use('/api/materials', require('../routes/materials'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  await addMaterial(1, 'ordinary', ['notes.txt', 'report.html', 'figure.svg', '%2e%2e.txt', '中文图.png']);
  await addMaterial(2, 'tester', ['secret.txt'], true);
});
test.after(async () => {
  await previews.waitForIdle();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(root, { recursive: true, force: true });
});

test('exact authenticated file boundary rejects encodings, unknown, state and unpublished targets', async () => {
  assert.equal((await request('/materials-files/ordinary/notes.txt', '')).status, 401);
  assert.equal((await request('/materials-files/ordinary/notes.txt')).body, 'fixture');
  assert.equal((await request('/materials-files/tester/secret.txt')).status, 403);
  assert.equal((await request('/materials-files/tester/secret.txt', 'admin')).status, 200);
  for (const target of [
    '/materials-files/x/%2e%2e/tester/secret.txt', '/materials-files/x/../tester/secret.txt',
    '/materials-files/ordinary%2f..%2ftester/secret.txt', '/materials-files/ordinary/%2e%2e%5ctester%5csecret.txt',
    '/materials-files/ordinary/metadata.json', '/materials-files/ordinary/资料说明.txt',
    '/materials-files/ordinary/_preview/state.json', '/materials-files/unknown/notes.txt',
    '/materials-files/ordinary/notes.txt/extra', '/materials-files/ordinary/%00', '/materials-files/ordinary/%zz'
  ]) assert.equal((await request(encodeURI(target).replace(/%25/g, '%'))).status, 404, target);
  assert.equal((await request('/materials-files/ordinary/%252e%252e.txt')).status, 200, 'literal percent filename remains addressable exactly once');
  assert.equal((await request('/materials-files/ordinary/' + encodeURIComponent('中文图.png'))).status, 200);
  materials[0].is_published = 0;
  assert.equal((await request('/materials-files/ordinary/notes.txt')).status, 404);
  materials[0].is_published = 1;
});
test('active originals are attachments and sanitized-preview source remains available', async () => {
  for (const name of ['report.html', 'figure.svg']) {
    const result = await request('/materials-files/ordinary/' + name);
    assert.equal(result.status, 200);
    assert.match(result.headers['content-disposition'], /^attachment;/);
    assert.match(result.headers['content-type'], /application\/octet-stream/);
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.match(result.headers['content-security-policy'], /^sandbox;/);
  }
  await previews.scheduleMaterialPreviews('ordinary', ['report.html', 'figure.svg']);
  const response = await request('/api/materials/1/files/report.html/preview');
  const payload = JSON.parse(response.body);
  assert.equal(payload.data.kind, 'html');
  assert.match(payload.data.content, /Meeting report/);
  assert.equal(payload.data.url, undefined);
});
test('storage reservations enforce account concurrency and finite quota before allocation', async () => {
  const first = await storage.reserveStorage(1, { bytes: 1, upload: true });
  const second = await storage.reserveStorage(1, { bytes: 1, upload: true });
  await assert.rejects(storage.reserveStorage(1, { bytes: 1, upload: true }), error => error.status === 429);
  first.release(); second.release();
  await assert.rejects(storage.reserveStorage(1, { bytes: storage.LIMITS.accountBytes + 1 }), error => error.status === 413);
  const directory = path.join(storage.stagingRoot, '1', 'task_1234');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'retained'), 'staged');
  const trash = path.join(storage.profileRoot, 'user-1', 'deleted', '1-old');
  await fs.mkdir(trash, { recursive: true });
  await fs.writeFile(path.join(trash, 'retained'), 'trash');
  const reservation = await storage.reserveStorage(1, { bytes: 1 });
  reservation.release();
});

function streamBytes(bytes, slow = false) {
  const chunk = Buffer.alloc(64 * 1024, 42);
  return Readable.from((async function* () {
    let remaining = bytes;
    while (remaining > 0) {
      const size = Math.min(chunk.length, remaining);
      yield size === chunk.length ? chunk : chunk.subarray(0, size);
      remaining -= size;
      if (slow) await new Promise(resolve => setTimeout(resolve, 1));
    }
  })());
}
function store(req, bytes, slow = false) {
  return new Promise((resolve, reject) => storage.createDiskStorage()._handleFile(req, { stream: streamBytes(bytes, slow) }, (error, info) => error ? reject(error) : resolve(info)));
}
async function uploadRequest() {
  const req = new EventEmitter();
  req.materialUploadDirectory = await fs.mkdtemp(path.join(root, 'stream-'));
  req.materialUploadBytes = 0;
  return req;
}
test('real 500MiB file streams with bounded RSS and exact default boundary', async () => {
  const req = await uploadRequest();
  const baseline = process.memoryUsage().rss;
  let peak = baseline;
  const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 5);
  try {
    const info = await store(req, storage.LIMITS.fileBytes);
    assert.equal((await fs.stat(info.path)).size, 500 * 1024 * 1024);
    assert.ok(peak - baseline < 150 * 1024 * 1024, `RSS grew ${(peak - baseline) / 1024 / 1024}MiB`);
    console.log(`500MiB stream RSS delta: ${((peak - baseline) / 1024 / 1024).toFixed(1)}MiB`);
  } finally { clearInterval(timer); await fs.rm(req.materialUploadDirectory, { recursive: true, force: true }); }
  const oversized = await uploadRequest();
  await assert.rejects(store(oversized, storage.LIMITS.fileBytes + 1), error => error.status === 413);
  assert.deepEqual(await fs.readdir(oversized.materialUploadDirectory), []);
});
test('aggregate and aborted streams fail with no partial-file leak', async () => {
  const req = await uploadRequest();
  const first = await store(req, 350 * 1024 * 1024);
  await assert.rejects(store(req, 251 * 1024 * 1024), error => error.status === 413);
  assert.deepEqual(await fs.readdir(req.materialUploadDirectory), [path.basename(first.path)]);
  await fs.rm(req.materialUploadDirectory, { recursive: true, force: true });
  const aborted = await uploadRequest();
  const operation = store(aborted, 100 * 1024 * 1024, true);
  setTimeout(() => aborted.emit('aborted'), 10);
  await assert.rejects(operation, /取消/);
  assert.deepEqual(await fs.readdir(aborted.materialUploadDirectory), []);
});
test('incoming cleanup removes only marked expired leases and preserves unknown legacy files', async () => {
  const owner = path.join(storage.stagingRoot, '_incoming', '1');
  for (const name of ['upload-known1', 'upload-unknown1']) await fs.mkdir(path.join(owner, name), { recursive: true });
  await fs.writeFile(path.join(owner, 'upload-known1', 'lease.json'), JSON.stringify({ type: 'dbdwz-incoming-v1', userId: 1, createdAt: '2000-01-01T00:00:00Z' }));
  await fs.writeFile(path.join(owner, 'upload-unknown1', 'old.bin'), 'retain');
  await storage.cleanupExpiredIncoming();
  await assert.rejects(fs.access(path.join(owner, 'upload-known1')));
  assert.equal(await fs.readFile(path.join(owner, 'upload-unknown1', 'old.bin'), 'utf8'), 'retain');
});
test('archive output is reserved and failed entry streams leave no partial file', async () => {
  const extractor = require('../services/archive-extractor');
  const unzipper = require('unzipper');
  const directory = await fs.mkdtemp(path.join(root, 'archive-'));
  const archivePath = path.join(directory, 'input.zip');
  await fs.writeFile(archivePath, 'synthetic archive envelope');
  const open = unzipper.Open.file;
  unzipper.Open.file = async () => ({ files: [{ type: 'File', path: 'notes.txt', uncompressedSize: 1, compressedSize: 1, stream: () => streamBytes(extractor.LIMITS.singleFileBytes + 1) }] });
  const reservation = await storage.reserveStorage(1, { bytes: extractor.LIMITS.totalBytes, files: extractor.LIMITS.fileCount });
  try {
    await assert.rejects(extractor.extractZip({ archivePath, archiveName: 'input.zip', targetDirectory: directory, parentClientFileId: 'zip_1234', usedNames: new Set() }), /实际大小/);
    assert.deepEqual(await fs.readdir(directory), ['input.zip']);
    unzipper.Open.file = async () => ({ files: [{ type: 'File', path: 'notes.txt', uncompressedSize: 7, compressedSize: 7, stream: () => Readable.from(['fixture']) }] });
    const extracted = await extractor.extractZip({ archivePath, archiveName: 'input.zip', targetDirectory: directory, parentClientFileId: 'zip_1234', usedNames: new Set() });
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0].size, 7);
    assert.equal(await fs.readFile(path.join(directory, extracted[0].storedName), 'utf8'), 'fixture');
  } finally { unzipper.Open.file = open; reservation.release(); }
});

function sendBody(target, body, contentType) {
  const url = new URL(origin);
  const request = http.request({ hostname: url.hostname, port: url.port, path: target, method: 'POST', headers: {
    'x-test-role': 'user', 'Content-Type': contentType, 'Content-Length': body.length
  } });
  request.on('error', () => {});
  request.on('response', response => response.resume());
  request.end(body);
  return request;
}
async function disconnectDuringCopy(target, body, contentType, checkLease) {
  const original = fs.copyFile;
  let release;
  let started;
  const start = new Promise(resolve => { started = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  fs.copyFile = async (source, destination) => { started(); await barrier; return original(source, destination); };
  const before = (await fs.readdir(storage.resourceRoot)).sort();
  try {
    const client = sendBody(target, body, contentType);
    await start;
    client.destroy();
    await new Promise(resolve => setTimeout(resolve, 20));
    if (checkLease) {
      const other = await storage.reserveStorage(1, { bytes: 1, upload: true });
      await assert.rejects(storage.reserveStorage(1, { bytes: 1, upload: true }), error => error.status === 429);
      other.release();
    }
    release();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 5));
      if (JSON.stringify((await fs.readdir(storage.resourceRoot)).sort()) === JSON.stringify(before)) break;
    }
    assert.deepEqual((await fs.readdir(storage.resourceRoot)).sort(), before, 'cancelled copy destination is removed after the pending copy settles');
    const one = await storage.reserveStorage(1, { bytes: 1, upload: true });
    const two = await storage.reserveStorage(1, { bytes: 1, upload: true });
    one.release(); two.release();
  } finally { release(); fs.copyFile = original; }
}
test('disconnect after multipart parsing retains admission until the pending route copy settles', async () => {
  const boundary = 'synthetic-boundary';
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="ordinary.txt"\r\nContent-Type: text/plain\r\n\r\nfixture\r\n--${boundary}--\r\n`);
  await disconnectDuringCopy('/api/materials/upload', body, `multipart/form-data; boundary=${boundary}`, true);
});
test('disconnect during finalize preserves staged source and removes uncommitted copies', async () => {
  const task = 'finalize_1234';
  const directory = path.join(storage.stagingRoot, '1', task);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'source'), 'fixture');
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ uploadTaskId: task, updatedAt: new Date().toISOString(), files: [{ clientFileId: 'file_1234', storedName: 'source', originalName: 'notes.txt', size: 7 }] }));
  await disconnectDuringCopy('/api/materials/finalize', Buffer.from(JSON.stringify({ uploadTaskId: task })), 'application/json', false);
  assert.equal(await fs.readFile(path.join(directory, 'source'), 'utf8'), 'fixture');
});
test('preview admission is bounded per account and globally, and round robin serves another owner next', async () => {
  const gate = path.join(root, 'converter-release');
  const log = path.join(root, 'converter.log');
  const binary = path.join(root, 'converter');
  await fs.writeFile(binary, '#!/usr/bin/env node\nconst fs=require("fs"),p=require("path");const a=process.argv.slice(2),src=a[a.length-1],out=a[a.indexOf("--outdir")+1];fs.appendFileSync(process.env.MOCK_CONVERTER_LOG,src+"\\n");const t=setInterval(()=>{if(!fs.existsSync(process.env.MOCK_CONVERTER_GATE))return;clearInterval(t);fs.writeFileSync(p.join(out,p.parse(src).name+".pdf"),"%PDF-1.4\\nfixture");},5);\n');
  await fs.chmod(binary, 0o700);
  process.env.LIBREOFFICE_BIN = binary;
  process.env.MOCK_CONVERTER_GATE = gate;
  process.env.MOCK_CONVERTER_LOG = log;
  const names = Array.from({ length: 9 }, (_, index) => `a${index}.docx`);
  await addMaterial(10, 'owner10', names);
  for (let index = 0; index < 8; index += 1) assert.equal((await previews.scheduleFilePreview('owner10', names[index], { userId: 10 })).status, 'queued');
  assert.equal((await previews.scheduleFilePreview('owner10', names[8], { userId: 10 })).status, 'failed');
  await addMaterial(11, 'owner11', ['b.docx']);
  assert.equal((await previews.scheduleFilePreview('owner11', 'b.docx', { userId: 11 })).status, 'queued');
  await fs.writeFile(gate, 'go');
  await previews.waitForIdle();
  const order = (await fs.readFile(log, 'utf8')).trim().split('\n');
  assert.match(order[1], /owner11/, 'the second account does not wait behind the first account backlog');
  await fs.rm(gate);
  for (let owner = 20; owner < 28; owner += 1) {
    const folder = `owner${owner}`;
    await addMaterial(owner, folder, names.slice(0, 8));
    for (const filename of names.slice(0, 8)) assert.equal((await previews.scheduleFilePreview(folder, filename, { userId: owner })).status, 'queued');
  }
  await addMaterial(28, 'owner28', ['overflow.docx']);
  assert.equal((await previews.scheduleFilePreview('owner28', 'overflow.docx', { userId: 28 })).status, 'failed');
  assert.ok(previews.getQueueStatus().waiting <= 63);
  await fs.writeFile(gate, 'go');
  await previews.waitForIdle();
  assert.equal(previews.getQueueStatus().waiting, 0);
});
test('native HTML fallback needs no window and native downloads carry Bearer headers', async () => {
  const source = (await fs.readFile(path.join(__dirname, '../../src/pages/material-detail/material-detail.vue'), 'utf8'))
    .replace(/\/\/ #ifdef H5[\s\S]*?\/\/ #endif/g, '')
    .replace(/\/\/ #ifndef H5|\/\/ #endif/g, '');
  const render = source.match(/    async renderUntrustedDocument\(content\) \{([\s\S]*?)\n    \},\n    renderLatex/)[1];
  const context = {};
  new Function('content', render).call(context, '<h1>Inert report</h1>');
  assert.equal(context.resolvedPreviewKind, 'text');
  assert.equal(context.previewText, '<h1>Inert report</h1>');
  const methods = source.slice(source.indexOf('    downloadNativeFile(url)'), source.indexOf('    formatFileSize(size)')).replace(/,\s*$/, '');
  let downloaded;
  let opened;
  const uni = {
    getStorageSync: () => 'synthetic-bearer',
    downloadFile(options) { downloaded = options; options.success({ statusCode: 200, tempFilePath: '/synthetic/temp.pdf' }); },
    openDocument(options) { opened = options; },
    showToast() { throw new Error('Unexpected native download failure'); }
  };
  const client = new Function('uni', `return ({${methods}})`)(uni);
  client.fileUrl = () => 'https://fixture.invalid/materials-files/demo/report.pdf';
  client.downloadFile({ name: 'report.pdf' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(downloaded.header.Authorization, 'Bearer synthetic-bearer');
  assert.ok(!downloaded.url.includes('access_token'));
  assert.equal(opened.filePath, '/synthetic/temp.pdf');
});
test('video output cap applies to one job while all retained previews still count toward quota', async () => {
  await addMaterial(99, 'existing-previews', ['meeting.mov']);
  const cache = path.join(storage.resourceRoot, 'existing-previews', '_preview');
  await fs.mkdir(cache, { recursive: true });
  const existing = path.join(cache, 'existing.pdf');
  await fs.writeFile(existing, '');
  await fs.truncate(existing, 300 * 1024 * 1024);
  const binary = path.join(root, 'video-converter');
  await fs.writeFile(binary, '#!/usr/bin/env node\nconst fs=require("fs"),out=process.argv.at(-1);fs.writeFileSync(out,"");fs.truncateSync(out,201*1024*1024);setTimeout(()=>{},350);\n');
  await fs.chmod(binary, 0o700);
  process.env.FFMPEG_BIN = binary;
  await previews.scheduleFilePreview('existing-previews', 'meeting.mov', { userId: 99 });
  await previews.waitForIdle();
  const state = await previews.getPreviewState('existing-previews', 'meeting.mov');
  assert.equal(state.status, 'ready');
  assert.equal((await fs.stat(path.join(cache, state.outputFile))).size, 201 * 1024 * 1024);
  assert.equal((await fs.stat(existing)).size, 300 * 1024 * 1024);
  assert.ok(!(await fs.readdir(cache)).some(name => name.startsWith('.job-')));
});
test('pending quota scans are admitted synchronously and disconnected uploads skip queued scans', async () => {
  const original = pool.query;
  let release;
  let started;
  let scans = 0;
  const barrier = new Promise(resolve => { release = resolve; });
  const first = new Promise(resolve => { started = resolve; });
  pool.query = async (sql, args) => {
    if (sql.includes('SELECT id, folder, user_id FROM meeting_materials')) {
      scans += 1;
      started();
      await barrier;
    }
    return original.call(pool, sql, args);
  };
  const clients = [];
  const statuses = [];
  const boundary = 'quota-boundary';
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\n\r\nfixture\r\n--${boundary}--\r\n`);
  try {
    for (let index = 0; index < 40; index += 1) {
      const client = sendBody('/api/materials/stage', body, `multipart/form-data; boundary=${boundary}`);
      client.on('response', response => statuses.push(response.statusCode));
      clients.push(client);
    }
    await first;
    for (let attempt = 0; attempt < 100 && statuses.length < 36; attempt += 1) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(statuses.filter(status => status === 429).length, 36, 'only four same-account quota checks may wait behind the blocked scan');
    for (const client of clients) client.destroy();
    await new Promise(resolve => setTimeout(resolve, 20));
    release();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(scans, 1, 'disconnected queued requests never perform a database/storage scan');
  } finally {
    for (const client of clients) client.destroy();
    release();
    pool.query = original;
  }
  const control = await storage.reserveStorage(1, { bytes: 1 });
  control.release();
});
test('free disk admission accounts for every active physical reservation', async () => {
  const original = fs.statfs;
  fs.statfs = async () => ({ bavail: 600 * 1024 * 1024, bsize: 1 });
  let first;
  try {
    first = await storage.reserveStorage(50, { bytes: 400 * 1024 * 1024 });
    await assert.rejects(storage.reserveStorage(51, { bytes: 400 * 1024 * 1024 }), error => error.status === 507);
  } finally { if (first) first.release(); fs.statfs = original; }
});
test('active and queued previews settle before trash/delete, and restore/replacement starts a fresh job', async () => {
  const trash = require('../services/trash-storage');
  const marker = path.join(root, 'lifecycle-starts');
  const gate = path.join(root, 'lifecycle-release');
  const binary = path.join(root, 'lifecycle-converter');
  await fs.writeFile(binary, '#!/usr/bin/env node\nconst fs=require("fs"),p=require("path"),a=process.argv.slice(2),src=a.at(-1),out=a[a.indexOf("--outdir")+1];fs.readFileSync(src);fs.appendFileSync(process.env.LIFECYCLE_MARKER,src+"\\n");const timer=setInterval(()=>{if(!fs.existsSync(process.env.LIFECYCLE_GATE))return;clearInterval(timer);fs.writeFileSync(p.join(out,p.parse(src).name+".pdf"),"%PDF-1.4\\ncomplete");},5);\n');
  await fs.chmod(binary, 0o700);
  process.env.LIBREOFFICE_BIN = binary;
  process.env.LIFECYCLE_MARKER = marker;
  process.env.LIFECYCLE_GATE = gate;
  const material = await addMaterial(80, 'lifecycle', ['meeting.docx', 'queued.docx']);
  const other = await addMaterial(81, 'lifecycle-other', ['other.docx']);
  const starts = async () => (await fs.readFile(marker, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length;
  const waitStarts = async expected => {
    for (let attempt = 0; attempt < 200 && await starts() < expected; attempt += 1) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(await starts() >= expected);
  };
  await previews.scheduleFilePreview(material.folder, 'meeting.docx', { userId: 80 });
  await waitStarts(1);
  await previews.scheduleFilePreview(material.folder, 'queued.docx', { userId: 80 });
  await previews.scheduleFilePreview(other.folder, 'other.docx', { userId: 81 });
  await assert.rejects(storage.reserveStorage(80, { bytes: storage.LIMITS.accountBytes - 1024 }), error => error.status === 413);
  const removedPath = path.join(storage.resourceRoot, material.folder);
  const deletedPath = await trash.moveToTrash(material);
  await assert.rejects(fs.access(removedPath));
  assert.ok((await fs.readdir(deletedPath)).includes('meeting.docx'));
  await fs.writeFile(gate, 'go');
  await previews.waitForIdle();
  await assert.rejects(fs.access(removedPath), 'cancelled converter must not recreate the old resource folder');
  assert.equal((await previews.getPreviewState(other.folder, 'other.docx')).status, 'ready');
  const restored = await trash.restoreFromTrash(material);
  await previews.scheduleFilePreview(restored.folder, 'meeting.docx', { userId: 80 });
  await previews.waitForIdle();
  assert.equal((await previews.getPreviewState(restored.folder, 'meeting.docx')).status, 'ready');
  await fs.rm(gate);
  const before = await starts();
  await previews.scheduleFilePreview(restored.folder, 'meeting.docx', { userId: 80, force: true });
  await waitStarts(before + 1);
  const release = await previews.cancelMaterialPreviews(restored.folder, ['meeting.docx']);
  try {
    await previews.removeFilePreview(restored.folder, 'meeting.docx');
    await fs.writeFile(path.join(removedPath, 'meeting.docx'), 'replacement-source');
  } finally { release(); }
  await fs.writeFile(gate, 'go');
  await previews.scheduleFilePreview(restored.folder, 'meeting.docx', { userId: 80, force: true });
  await previews.waitForIdle();
  assert.equal((await previews.getPreviewState(restored.folder, 'meeting.docx')).status, 'ready');
  await fs.rm(gate);
  const last = await starts();
  await previews.scheduleFilePreview(restored.folder, 'meeting.docx', { userId: 80, force: true });
  await waitStarts(last + 1);
  await trash.permanentlyRemove(material);
  materials.splice(materials.indexOf(material), 1);
  await fs.writeFile(gate, 'go');
  await previews.waitForIdle();
  await assert.rejects(fs.access(removedPath));
  await assert.rejects(fs.access(deletedPath));
  const original = fs.statfs;
  fs.statfs = async () => ({ bavail: 1024 * 1024 * 1024 * 1024, bsize: 1 });
  try {
    const fresh = await storage.reserveStorage(80, { bytes: storage.LIMITS.accountBytes - 1024 });
    fresh.release();
  } finally { fs.statfs = original; }
});
test('real Office and FFmpeg binaries work through the preview scheduler', { skip: !process.env.RUN_REAL_MATERIAL_CONVERTERS }, async () => {
  const { execFile } = require('node:child_process');
  const exec = require('node:util').promisify(execFile);
  const archiver = require('archiver');
  const office = await addMaterial(90, 'real-office', ['meeting.docx']);
  const video = await addMaterial(91, 'real-video', ['meeting.avi']);
  const source = path.join(storage.resourceRoot, office.folder, 'meeting.docx');
  await new Promise((resolve, reject) => {
    const output = require('node:fs').createWriteStream(source);
    const archive = archiver('zip');
    output.on('close', resolve); output.on('error', reject); archive.on('error', reject);
    archive.pipe(output);
    archive.append('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', { name: '[Content_Types].xml' });
    archive.append('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', { name: '_rels/.rels' });
    archive.append('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic meeting report</w:t></w:r></w:p></w:body></w:document>', { name: 'word/document.xml' });
    archive.finalize();
  });
  await exec(process.env.REAL_FFMPEG_BIN, ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=0.3', '-c:v', 'mpeg4', path.join(storage.resourceRoot, video.folder, 'meeting.avi')]);
  process.env.LIBREOFFICE_BIN = process.env.REAL_LIBREOFFICE_BIN;
  process.env.FFMPEG_BIN = process.env.REAL_FFMPEG_BIN;
  await previews.scheduleFilePreview(office.folder, 'meeting.docx', { userId: 90 });
  await previews.scheduleFilePreview(video.folder, 'meeting.avi', { userId: 91 });
  await previews.waitForIdle();
  const officeState = await previews.getPreviewState(office.folder, 'meeting.docx');
  const videoState = await previews.getPreviewState(video.folder, 'meeting.avi');
  assert.equal(officeState.status, 'ready', officeState.error);
  assert.equal(videoState.status, 'ready', videoState.error);
  const pdf = await fs.readFile(path.join(storage.resourceRoot, office.folder, '_preview', officeState.outputFile));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const target = path.join(storage.resourceRoot, video.folder, '_preview', videoState.outputFile);
  const probe = await exec(process.env.REAL_FFPROBE_BIN, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1', target]);
  assert.match(probe.stdout, /codec_name=h264/);
});
