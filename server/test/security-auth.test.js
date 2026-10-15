const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const Module = require('module');
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const vm = require('vm');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// Synthetic fixture key only. Never load server/.env or a live database config.
process.env.JWT_SECRET = 'isolated-auth-regression-key-not-a-deployment-secret';
require.cache[require.resolve('dotenv')] = { exports: { config() {} } };
const socketPath = process.env.SECURITY_TEST_MYSQL_SOCKET;
if (!socketPath || !socketPath.startsWith('/tmp/dbdwz-auth-')) throw new Error('Run node test/run-auth-native.js to create an isolated database');

let pool, server, base, auth, avatar, limiter;
let png, originalCompare;
const profiles = new Map();
let profileSyncHook = null;

async function request(url, { token, cookie, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + url, { method, redirect: 'manual', headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookie ? { Cookie: cookie } : {}), ...headers
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let payload; try { payload = JSON.parse(text); } catch { payload = text; }
  return { response, payload };
}

async function login(name = '111', password = 'fixture-password', source = '198.51.100.1') {
  const result = await request('/api/auth/login', { method: 'POST', body: { username: name, password }, headers: { 'X-Forwarded-For': source } });
  assert.equal(result.payload.code, 200);
  return result.payload.data.token;
}

async function loadIsolatedProfiles() {
  const filename = path.join(__dirname, '..', 'services', 'profile-storage.js');
  const source = await fs.readFile(filename, 'utf8');
  const isolated = new Module(filename, module);
  isolated.filename = filename; isolated.paths = module.paths;
  const previous = process.env.PROFILE_ROOT;
  process.env.PROFILE_ROOT = path.join(process.env.SECURITY_TEST_TMP, 'profiles');
  try { isolated._compile(source, filename); }
  finally { if (previous === undefined) delete process.env.PROFILE_ROOT; else process.env.PROFILE_ROOT = previous; }
  return isolated.exports;
}

before(async () => {
  pool = mysql.createPool({ socketPath, user: 'root', connectionLimit: 10 });
  await pool.query('CREATE DATABASE fixture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await pool.query('USE fixture');
  // Every pooled connection uses only this newly created database.
  await pool.end();
  pool = mysql.createPool({ socketPath, user: 'root', database: 'fixture', connectionLimit: 10 });
  const dbSource = await fs.readFile(path.join(__dirname, '..', 'db.js'), 'utf8');
  const usersDDL = dbSource.match(/CREATE TABLE IF NOT EXISTS users \([\s\S]*?ENGINE=InnoDB[^`]+/)[0];
  await pool.query(usersDDL);
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'auth-sessions.sql'), 'utf8');
  await pool.query(schema);
  await pool.query(schema); // Startup migration is idempotent for existing accounts.
  for (const table of ['collaboration_spaces', 'collaboration_papers', 'collaboration_categories', 'collaboration_presence']) {
    await pool.query(dbSource.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?ENGINE=InnoDB[^\\x60]+`))[0]);
  }
  const hash = await bcrypt.hash('fixture-password', 4);
  for (const [id, name] of [[1, '111'], [2, 'other'], [3, 'rename'], [4, 'collation'], [5, 'concurrency'], [6, 'legacy'], [7, 'latency'], [8, 'avatar_user']]) {
    await pool.query('INSERT INTO users (id,username,password,nickname,role,status) VALUES (?,?,?,?,?,?)', [id, name, hash, name, 'user', 0]);
  }
  await pool.query('UPDATE users SET password=? WHERE id=6', [await bcrypt.hash('旧'.repeat(25), 4)]);
  await pool.query('INSERT INTO collaboration_spaces (id,name,owner_id) VALUES (1,?,1)', ['Fixture papers']);
  await pool.query('INSERT INTO collaboration_papers (id,space_id,uploader_id,title,filename,stored_name,category) VALUES (1,1,1,?,?,?,?)', ['Fixture', 'fixture.txt', 'fixture.txt', 'Fixture category']);
  const paperRoot = path.join(process.env.SECURITY_TEST_TMP, 'papers');
  await fs.mkdir(paperRoot, { recursive: true });
  await fs.writeFile(path.join(paperRoot, 'fixture.txt'), 'synthetic fixture paper');
  require.cache[require.resolve('../db')] = { exports: { getPool: () => pool } };
  const syncProfile = async (pool, userId, extra = {}) => {
    if (profileSyncHook) await profileSyncHook(userId);
    const [[user]] = await pool.query('SELECT * FROM users WHERE id=?', [userId]);
    if (!user) return null;
    const profile = profiles.get(userId) || { userId, account: {}, meta: {} };
    profile.account = { ...profile.account, username: user.username, passwordHash: user.password, status: user.status };
    profile.meta = { ...profile.meta, ...extra }; profiles.set(userId, profile); return profile;
  };
  require.cache[require.resolve('../services/profile-storage')] = { exports: {
    readProfile: async id => profiles.get(id) || null,
    syncUserProfileFromDatabase: syncProfile,
    updateUserProfile: async (pool, userId, update) => { const profile = await syncProfile(pool, userId); if (profile) await update(profile); return profile; },
    publicProfile: profile => profile
  } };
  auth = require('../middleware/auth');
  avatar = require('../services/avatar');
  limiter = require('../middleware/login-limiter');
  const app = express();
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/auth', require('../routes/auth'));
  const collaborationFile = path.join(__dirname, '..', 'routes', 'collaboration.js');
  const collaborationSource = (await fs.readFile(collaborationFile, 'utf8')).replace("path.resolve(__dirname, '..', '..', '协作论文')", JSON.stringify(paperRoot));
  const isolatedCollaboration = new Module(collaborationFile, module);
  isolatedCollaboration.filename = collaborationFile; isolatedCollaboration.paths = module.paths;
  isolatedCollaboration._compile(collaborationSource, collaborationFile);
  app.use('/api/collaboration', isolatedCollaboration.exports);
  app.get('/tutorial', auth.tutorialStaticMiddleware, (req, res) => res.send('tutorial fixture'));
  app.get('/private', auth.authMiddleware, (req, res) => res.json({ code: 200, user: req.user }));
  app.get('/optional', auth.optionalAuth, (req, res) => res.json({ code: 200, userId: req.user?.id || null }));
  const sourceApp = express();
  sourceApp.set('trust proxy', false);
  sourceApp.use(express.json());
  sourceApp.post('/', limiter.createLoginLimiter({ sourceLimit: 2 }).middleware, (req, res) => res.sendStatus(200));
  app.use('/direct-source', sourceApp);
  server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  base = `http://127.0.0.1:${server.address().port}`;
  png = 'data:image/png;base64,' + (await sharp({ create: { width: 2, height: 2, channels: 4, background: '#f00' } }).png().toBuffer()).toString('base64');
  originalCompare = bcrypt.compare;
});

after(async () => {
  bcrypt.compare = originalCompare;
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
});

test('logout revokes bearer/cookie, tutorial ticket/session, optional auth, and downloads across module reload', async () => {
  const token = await login();
  const decoded = jwt.decode(token);
  const secondToken = await login();
  // Online status is not an account-disable flag; another session remains valid.
  await pool.query('UPDATE users SET status=0 WHERE id=1');
  assert.equal((await request('/private', { token })).response.status, 200);
  const ticket = (await request('/api/auth/tutorial-ticket', { method: 'POST', token })).payload.data.ticket;
  const session = await request(`/api/auth/tutorial-session?ticket=${encodeURIComponent(ticket)}&next=${encodeURIComponent('/static/web/tutorial.html')}`);
  assert.equal(session.response.status, 302);
  const cookie = session.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/tutorial', { cookie })).response.status, 200);
  assert.equal((await request('/private', { token: ticket })).response.status, 401);
  assert.equal((await request('/api/auth/logout', { method: 'POST', token })).payload.code, 200);
  for (const options of [{ token }, { cookie: `dbdwz_token=${token}` }]) assert.equal((await request('/private', options)).response.status, 401);
  assert.equal((await request('/tutorial', { cookie })).response.status, 401);
  assert.equal((await request(`/api/auth/tutorial-session?ticket=${ticket}&next=/static/web/tutorial.html`)).response.status, 401);
  assert.equal((await request('/optional', { token })).payload.userId, null);
  assert.equal((await request('/api/collaboration/papers/1/file', { token })).response.status, 401);
  assert.equal((await request('/api/collaboration/spaces/1/download', { token })).response.status, 401);
  assert.equal((await request('/private', { token: secondToken })).response.status, 200);
  assert.equal((await pool.query('SELECT id FROM auth_sessions WHERE id=?', [decoded.sid]))[0].length, 0);
  delete require.cache[require.resolve('../middleware/auth')];
  await assert.rejects(require('../middleware/auth').verifyToken(token));
});

test('profile refresh keeps the same revocable session and tester account behavior', async () => {
  const token = await login('rename');
  const result = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'renamed', nickname: 'Renamed', avatar: png } });
  assert.equal(result.payload.code, 200);
  const refreshed = result.payload.data.token;
  assert.equal(jwt.decode(refreshed).sid, jwt.decode(token).sid);
  assert.equal((await request('/private', { token: refreshed })).payload.user.username, 'renamed');
  assert.equal((await request('/api/auth/logout', { method: 'POST', token: refreshed })).payload.code, 200);
  assert.equal((await request('/private', { token })).response.status, 401);
  assert.equal((await request('/private', { token: refreshed })).response.status, 401);
  const [[user]] = await pool.query('SELECT username,role FROM users WHERE id=1');
  assert.deepEqual(user, { username: '111', role: 'user' });
});

test('password change revokes all sessions and derived credentials; fresh login and other users still work', async () => {
  const token = await login();
  const second = await login();
  const other = await login('other');
  const ticket = (await request('/api/auth/tutorial-ticket', { method: 'POST', token: second })).payload.data.ticket;
  const scoped = auth.generateTutorialSession(await auth.verifyToken(second));
  assert.equal((await request('/api/auth/password', { method: 'PUT', token, body: { currentPassword: 'fixture-password', newPassword: 'new-fixture-password' } })).payload.code, 200);
  for (const stale of [token, second]) assert.equal((await request('/private', { token: stale })).response.status, 401);
  assert.equal((await request('/tutorial', { cookie: `dbdwz_tutorial=${scoped}` })).response.status, 401);
  assert.equal((await request(`/api/auth/tutorial-session?ticket=${ticket}&next=/static/web/tutorial.html`)).response.status, 401);
  assert.equal((await request('/private', { token: other })).response.status, 200);
  const fresh = await login('111', 'new-fixture-password');
  assert.equal((await request('/private', { token: fresh })).response.status, 200);
  // Password changes outside this route also invalidate HMAC-bound credentials.
  await pool.query('UPDATE users SET password=? WHERE id=1', [await bcrypt.hash('external-reset-password', 4)]);
  assert.equal((await request('/private', { token: fresh })).response.status, 401);
});

test('legacy, malformed, expired, deleted-user, and scoped credentials cannot become website sessions', async () => {
  const legacy = jwt.sign({ id: 2, username: 'other', role: 'admin' }, process.env.JWT_SECRET);
  assert.equal((await request('/private', { token: legacy })).response.status, 401);
  const valid = await login('other');
  const claims = jwt.decode(valid); delete claims.iat; delete claims.exp;
  const expired = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await request('/private', { token: expired })).response.status, 401);
  const malformed = jwt.sign({ ...claims, pv: 'abc' }, process.env.JWT_SECRET);
  assert.equal((await request('/private', { token: malformed })).response.status, 401);
  const ticket = auth.generateTutorialTicket(await auth.verifyToken(valid));
  assert.equal((await request('/api/collaboration/papers/1/file', { token: ticket })).response.status, 401);
  await pool.query('DELETE FROM users WHERE id=2');
  assert.equal((await request('/private', { token: valid })).response.status, 401);
});

test('avatar writes/reads reject SVG and mismatched raster MIME, while genuine raster is re-encoded with nosniff', async () => {
  const token = await login('renamed');
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64');
  const disguised = svg.replace('image/svg+xml', 'image/png');
  for (const bad of [svg, disguised, 'data:image/png;base64,AAAA', png.replace('image/png', 'image/jpeg')]) {
    const rejected = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'renamed', nickname: 'Avatar', avatar: bad } });
    assert.equal(rejected.payload.code, 400);
    await pool.query('UPDATE users SET avatar=? WHERE id=3', [bad]);
    assert.equal((await request('/api/auth/avatar/3')).response.status, 404);
  }
  for (const format of ['png', 'jpeg', 'gif', 'webp']) {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#0f0' } })[format]().toBuffer();
    const input = `data:image/${format};base64,${buffer.toString('base64')}`;
    assert.match(await avatar.normalizeAvatar(input), /^data:image\/webp;base64,/);
  }
  const saved = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'renamed', nickname: 'Avatar', avatar: png } });
  assert.equal(saved.payload.code, 200);
  const response = await fetch(base + '/api/auth/avatar/3');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, 'webp');
});

test('persistent profile assets use the same raster boundary and clear unsafe historical avatars', async () => {
  const storage = await loadIsolatedProfiles();
  const safe = await storage.syncUserProfile({ id: 99, username: 'fixture', avatar: png });
  assert.match(safe.account.avatarFile, /^avatar\/avatar-[a-f0-9]+\.webp$/);
  const unsafe = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64');
  const cleared = await storage.syncUserProfile({ id: 99, username: 'fixture', avatar: unsafe });
  assert.equal(cleared.account.avatarFile, '');
  assert.deepEqual(await fs.readdir(path.join(storage.userProfileDirectory(99), 'avatar')), []);
});

test('avatar conversion has a bounded queue, deduplicates concurrent images, and evicts cached bytes', async () => {
  let calls = 0, active = 0, peak = 0;
  const releases = [];
  const normalize = avatar.createAvatarNormalizer({ maxConcurrent: 1, maxPending: 1, maxCacheBytes: 20,
    transform: async buffer => { calls += 1; active += 1; peak = Math.max(peak, active); await new Promise(resolve => releases.push(resolve)); active -= 1; return buffer.toString('base64'); }
  });
  const input = value => `data:image/png;base64,${Buffer.from(value).toString('base64')}`;
  const first = normalize(input('first-input'));
  const duplicate = normalize(input('first-input'));
  const queued = normalize(input('second-input'));
  await assert.rejects(normalize(input('third-input')), { code: 'AVATAR_BUSY' });
  assert.equal(calls, 1);
  releases.shift()();
  assert.equal(await first, await duplicate);
  await new Promise(resolve => setImmediate(resolve));
  releases.shift()();
  await queued;
  assert.equal(calls, 2);
  assert.equal(peak, 1);
  await normalize(input('second-input')); // retained within byte budget
  assert.equal(calls, 2);
  const evicted = normalize(input('first-input'));
  assert.equal(calls, 3); // first result was evicted rather than growing the cache
  releases.shift()(); await evicted;
});

test('download URLs no longer authenticate query tokens and same-origin cookies still work', async () => {
  const token = await login('renamed');
  for (const endpoint of ['/api/collaboration/papers/1/file', '/api/collaboration/spaces/1/download']) {
    assert.equal((await request(`${endpoint}?access_token=${token}`)).response.status, 401);
    assert.equal((await request(endpoint, { cookie: `dbdwz_token=${token}` })).response.status, 200);
    assert.equal((await request(endpoint, { token })).response.status, 200);
  }
  assert.equal((await request('/api/collaboration/papers/1/file', { cookie: `dbdwz_token=${token}` })).payload, 'synthetic fixture paper');
  const archive = await fetch(base + '/api/collaboration/spaces/1/download', { headers: { Cookie: `dbdwz_token=${token}` } });
  const archiveBytes = Buffer.from(await archive.arrayBuffer());
  assert.equal(archiveBytes.readUInt32LE(0), 0x04034b50);
  const zipped = await require('unzipper').Open.buffer(archiveBytes);
  assert.equal(zipped.files.length, 1);
  assert.equal((await zipped.files[0].buffer()).toString(), 'synthetic fixture paper');
  for (const file of ['src/pages/collaboration/collaboration.vue', 'src/pages/material-detail/material-detail.vue', 'src/pages/index/index.vue']) {
    assert.doesNotMatch(await fs.readFile(path.join(__dirname, '..', '..', file), 'utf8'), /access_token|withAccessToken/);
  }
});

test('login budgets collapse MySQL collation aliases, bound bcrypt concurrency, and ignore untrusted forwarded sources', async () => {
  assert.equal(limiter.accountKey('A'.repeat(1000000)).length, 64);
  assert.equal(limiter.accountKey({ username: 'ignored' }), limiter.accountKey(''));
  assert.equal(limiter.accountKey('ＦＯＯ'), limiter.accountKey('fòo'));
  for (const username of ['A'.repeat(1000000), { injected: 'object' }]) {
    const invalid = await request('/api/auth/login', { method: 'POST', body: { username, password: 'fixture-password' }, headers: { 'X-Forwarded-For': '198.51.100.200' } });
    assert.equal(invalid.payload.code, 400);
  }
  for (let index = 0; index < 10; index += 1) {
    const name = index % 2 ? 'ＣＯＬＬＡＴＩＯＮ' : 'collatiòn';
    const result = await request('/api/auth/login', { method: 'POST', body: { username: name, password: 'wrong' }, headers: { 'X-Forwarded-For': `198.51.100.${index + 10}` } });
    assert.equal(result.payload.code, 401);
  }
  const limited = await request('/api/auth/login', { method: 'POST', body: { username: 'COLLATION', password: 'fixture-password' }, headers: { 'X-Forwarded-For': '198.51.100.50' } });
  assert.equal(limited.response.status, 429);
  assert.equal(limited.response.headers.get('retry-after'), '900');
  for (let index = 0; index < 3; index += 1) {
    const response = await request('/direct-source', { method: 'POST', body: { username: `invalid-${index}` }, headers: { 'X-Forwarded-For': `203.0.113.${index}` } });
    assert.equal(response.response.status, index < 2 ? 200 : 429);
  }
  let active = 0, peak = 0;
  const pending = [];
  bcrypt.compare = async () => { active += 1; peak = Math.max(peak, active); await new Promise(resolve => pending.push(resolve)); active -= 1; return false; };
  const requests = Array.from({ length: 8 }, (_, index) => request('/api/auth/login', { method: 'POST', body: { username: 'concurrency', password: 'wrong' }, headers: { 'X-Forwarded-For': `192.0.2.${index}` } }));
  while (pending.length < 4) await new Promise(resolve => setTimeout(resolve, 5));
  await new Promise(resolve => setTimeout(resolve, 100));
  pending.forEach(resolve => resolve());
  const results = await Promise.all(requests);
  bcrypt.compare = originalCompare;
  assert.equal(peak, 4);
  assert.equal(results.filter(result => result.response.status === 429).length, 4);
  assert.equal(results.filter(result => result.payload.code === 401).length, 4);
  // Window expiry allows another ordinary attempt; no permanent account lock.
  let now = 0;
  const rolling = limiter.createLoginLimiter({ accountLimit: 1, now: () => now });
  const response = { set() {}, status() { return this; }, json() {} };
  assert.equal(rolling.allowUser(99, response), true);
  assert.equal(rolling.allowUser(99, response), false);
  now += 15 * 60 * 1000;
  assert.equal(rolling.allowUser(99, response), true);
});

test('legacy multibyte bcrypt passwords still log in and change to a byte-bounded password over HTTP', async () => {
  const oldPassword = '旧'.repeat(25); // 75 UTF-8 bytes: valid in the old character-count policy.
  const token = await login('legacy', oldPassword, '198.51.100.210');
  const rejected = await request('/api/auth/password', { method: 'PUT', token, body: { currentPassword: oldPassword, newPassword: '新'.repeat(25) } });
  assert.equal(rejected.response.status, 400);
  assert.match(rejected.payload.message, /72 字节/);
  assert.equal((await request('/private', { token })).response.status, 200);
  const changed = await request('/api/auth/password', { method: 'PUT', token, body: { currentPassword: oldPassword, newPassword: '新'.repeat(24) } });
  assert.equal(changed.payload.code, 200);
  const fresh = await login('legacy', '新'.repeat(24), '198.51.100.211');
  assert.equal((await request('/private', { token: fresh })).response.status, 200);
  const { validLoginPassword, validNewPassword } = require('../services/password-policy');
  assert.equal(validLoginPassword(oldPassword), true);
  assert.equal(validLoginPassword('a'.repeat(4097)), false);
  assert.equal(validNewPassword('新'.repeat(25), 12), false);
  assert.equal(validNewPassword('新'.repeat(24), 12), true);
  const clientSource = await fs.readFile(path.join(__dirname, '..', '..', 'src/utils/password-policy.js'), 'utf8');
  const client = {}; vm.runInNewContext(clientSource.replace('export function', 'function') + '\nthis.byteLength = passwordByteLength', client);
  for (const input of ['ASCII', '新'.repeat(24), '新'.repeat(25), '😀'.repeat(18), '\ud800']) assert.equal(client.byteLength(input), Buffer.byteLength(input, 'utf8'));
});

test('login responds with a usable persisted session while simulated slow profile I/O is still pending', async () => {
  let release, entered, finished = false;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  profileSyncHook = async userId => { if (userId === 7) { entered(); await blocked; finished = true; } };
  const began = performance.now();
  const response = login('latency', 'fixture-password', '198.51.100.212');
  await started;
  let timeout;
  try {
    const token = await Promise.race([response, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Login waited for unresolved profile sync')), 5000); })]);
    const responseMs = performance.now() - began;
    assert.equal(finished, false);
    assert.equal((await request('/private', { token })).response.status, 200);
    // Hold only synthetic profile I/O for another 400 ms; this is not a live-site benchmark.
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log(`Synthetic localhost login HTTP ${responseMs.toFixed(1)} ms; profile gate remained blocked for ${(performance.now() - began).toFixed(1)} ms before release`);
  } finally { clearTimeout(timeout); release(); profileSyncHook = null; }
});

test('background profile queue is bounded, deduplicates pending identities, and continues after failure', async () => {
  const { createLoginProfileSync } = require('../services/login-profile-sync');
  const calls = [], errors = [];
  let release, done;
  const blocked = new Promise(resolve => { release = resolve; });
  const drained = new Promise(resolve => { done = resolve; });
  const queue = createLoginProfileSync({ getPool: () => pool, maxPending: 2, onError: error => errors.push(error.message),
    sync: async (database, userId, extra) => { calls.push({ userId, extra }); if (userId === 1) await blocked; if (userId === 2) throw new Error('simulated I/O failure'); if (userId === 3) done(); }
  });
  queue.enqueue(1, 'first');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(queue.enqueue(2, 'old'), true);
  assert.equal(queue.enqueue(2, 'latest'), true);
  assert.equal(queue.enqueue(3, 'third'), true);
  assert.equal(queue.enqueue(4, 'overflow'), false);
  release(); await drained;
  assert.deepEqual(calls.map(call => call.userId), [1, 2, 3]);
  assert.equal(calls[1].extra.lastLoginAt, 'latest');
  assert.deepEqual(errors, ['simulated I/O failure']);
});

test('queued profile synchronization reads current DB state inside the foreground profile lock', async () => {
  const storage = await loadIsolatedProfiles();
  await storage.syncUserProfileFromDatabase(pool, 7);
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const updating = storage.updateUserProfile(pool, 7, async profile => { profile.drafts = [{ title: 'new draft' }]; entered(); await blocked; });
  await started;
  const queued = storage.syncUserProfileFromDatabase(pool, 7, { lastLoginAt: 'queued-login' });
  const hash = await bcrypt.hash('new-authoritative-password', 4);
  await pool.query('UPDATE users SET username=?, password=? WHERE id=7', ['latest_latency', hash]);
  release(); await updating; await queued;
  const current = await storage.readProfile(7);
  assert.equal(current.account.username, 'latest_latency');
  assert.equal(current.account.passwordHash, hash);
  assert.deepEqual(current.drafts, [{ title: 'new draft' }]);
});

test('login page navigates immediately after authentication and ignores duplicate submits', async () => {
  const source = await fs.readFile(path.join(__dirname, '..', '..', 'src/pages/login/login.vue'), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'this.component =');
  const events = [];
  let resolveLogin, count = 0;
  const context = { WebRecords: {}, login: async () => { count += 1; return new Promise(resolve => { resolveLogin = resolve; }); },
    setAuth: () => events.push('auth'), uni: { showToast: () => events.push('toast'), reLaunch: () => events.push('navigate') },
    setTimeout: () => { throw new Error('Navigation must not add a fixed delay'); }
  };
  vm.runInNewContext(script, context);
  const page = { ...context.component.data(), username: '111', password: 'fixture-password' };
  const first = context.component.methods.handleSubmit.call(page);
  await context.component.methods.handleSubmit.call(page);
  assert.equal(count, 1);
  assert.deepEqual(events, []);
  resolveLogin({ data: { token: 'synthetic-token', user: { username: '111' } } });
  await first;
  assert.deepEqual(events, ['auth', 'toast', 'navigate']);
  assert.equal(page.errorMsg, '');
  console.log('Login navigation: removed the source-confirmed 800 ms timer; navigation now occurs in the authentication completion turn');
});

test('large avatars use bounded WebP thumbnails, stable content URLs, lightweight DTOs and HTTP revalidation', async () => {
  const original = await sharp(crypto.randomBytes(1024 * 1024 * 4), { raw: { width: 1024, height: 1024, channels: 4 } }).png().toBuffer();
  const rawAvatar = `data:image/png;base64,${original.toString('base64')}`;
  await pool.query('UPDATE users SET avatar=? WHERE id=8', [rawAvatar]);
  const loggedIn = await request('/api/auth/login', { method: 'POST', body: { username: 'avatar_user', password: 'fixture-password' }, headers: { 'X-Forwarded-For': '198.51.100.214' } });
  assert.equal(loggedIn.payload.code, 200);
  assert.equal(Object.hasOwn(loggedIn.payload.data.user, 'avatar'), false);
  assert.ok(Buffer.byteLength(JSON.stringify(loggedIn.payload)) < 4096);
  const token = loggedIn.payload.data.token;
  const first = (await request('/api/auth/me', { token })).payload.data.user;
  const second = (await request('/api/auth/me', { token })).payload.data.user;
  assert.equal(first.avatarUrl, second.avatarUrl);
  assert.equal(first.avatarUrl, loggedIn.payload.data.user.avatarUrl);
  assert.equal(Object.hasOwn(first, 'avatar'), false);
  assert.ok(Buffer.byteLength(JSON.stringify(first)) < 1024);
  const sourceUrl = new URL(first.avatarUrl);
  const thumbnail = await fetch(first.avatarUrl);
  const bytes = Buffer.from(await thumbnail.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width <= 256 && metadata.height <= 256);
  assert.ok(bytes.length <= avatar.MAX_AVATAR_BYTES);
  assert.ok(bytes.length < original.length / 10);
  assert.equal(thumbnail.headers.get('content-type'), 'image/webp');
  assert.match(thumbnail.headers.get('cache-control'), /immutable/);
  const etag = thumbnail.headers.get('etag');
  const cached = await fetch(first.avatarUrl, { headers: { 'If-None-Match': etag } });
  assert.equal(cached.status, 304);
  assert.equal((await cached.arrayBuffer()).byteLength, 0);
  const [[stored]] = await pool.query('SELECT avatar FROM users WHERE id=8');
  assert.equal(stored.avatar, rawAvatar); // Read-time conversion never replaces a historical DB avatar.
  const unchanged = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'avatar_user', nickname: 'Only the name changes' } });
  assert.equal(unchanged.payload.code, 200);
  assert.equal(unchanged.payload.data.user.avatarUrl, first.avatarUrl);
  assert.equal((await pool.query('SELECT avatar FROM users WHERE id=8'))[0][0].avatar, rawAvatar);
  const again = await request('/api/auth/login', { method: 'POST', body: { username: 'avatar_user', password: 'fixture-password' }, headers: { 'X-Forwarded-For': '198.51.100.215' } });
  assert.equal(again.payload.data.user.avatarUrl, first.avatarUrl);
  await pool.query('INSERT INTO collaboration_presence (space_id,user_id,last_seen) VALUES (1,8,NOW())');
  await pool.query('UPDATE collaboration_papers SET uploader_id=8 WHERE id=1');
  const detail = await request('/api/collaboration/spaces/1', { token });
  assert.equal(detail.payload.code, 200);
  assert.equal(detail.payload.data.members[0].avatarUrl, first.avatarUrl);
  assert.equal(detail.payload.data.papers[0].uploader.avatarUrl, first.avatarUrl);
  assert.equal(JSON.stringify(detail.payload).includes('data:image/'), false);
  const legacyToken = await login('legacy', '新'.repeat(24), '198.51.100.216');
  const users = await request('/api/collaboration/users?q=avatar_user', { token: legacyToken });
  assert.equal(users.payload.data.users[0].avatarUrl, first.avatarUrl);
  assert.equal(JSON.stringify(users.payload).includes('data:image/'), false);
  const replaced = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'avatar_user', nickname: 'New image', avatar: png } });
  assert.equal(replaced.payload.code, 200);
  assert.notEqual(replaced.payload.data.user.avatarUrl, first.avatarUrl);
  assert.equal(Object.hasOwn(replaced.payload.data.user, 'avatar'), false);
  const oldVersion = await fetch(sourceUrl);
  assert.doesNotMatch(oldVersion.headers.get('cache-control'), /immutable/);
  await oldVersion.arrayBuffer();
  const removed = await request('/api/auth/me', { method: 'PUT', token, body: { username: 'avatar_user', nickname: 'No image', avatar: '' } });
  assert.equal(removed.payload.code, 200);
  assert.equal(removed.payload.data.user.avatarUrl, '');
  assert.equal((await request('/api/auth/avatar/8')).response.status, 404);
  console.log(`Synthetic noisy RGBA avatar: ${original.length} bytes at 1024x1024 -> ${bytes.length} WebP bytes at ${metadata.width}x${metadata.height}; stable URL + ETag 304; login JSON ${Buffer.byteLength(JSON.stringify(loggedIn.payload))} bytes`);
});

test('profile editor previews the URL and omits an unchanged avatar from save requests', async () => {
  const source = await fs.readFile(path.join(__dirname, '..', '..', 'src/pages/index/index.vue'), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'this.component =');
  const requests = [];
  const context = { WebRecords: {}, TeamProjects: {}, __APP_VERSION__: 'fixture', apiUrl: value => value,
    getUser: () => ({ id: 8, username: 'avatar_user', nickname: 'Avatar', avatarUrl: '/api/auth/avatar/8?v=stable' }),
    uni: { getStorageSync: () => 'synthetic-token', request: options => { requests.push(options); options.complete(); } }
  };
  vm.runInNewContext(script, context);
  const page = context.component.data();
  context.component.methods.openProfileEditor.call(page);
  assert.equal(page.profileForm.avatar, '/api/auth/avatar/8?v=stable');
  context.component.methods.saveProfile.call(page);
  assert.equal(Object.hasOwn(requests[0].data, 'avatar'), false);
  page.profileForm.avatar = png; page.profileForm.avatarChanged = true;
  context.component.methods.saveProfile.call(page);
  assert.equal(requests[1].data.avatar, png);
});

test('avatar thumbnails apply EXIF orientations 6 and 8 before stripping metadata', async () => {
  const redAndBlue = () => sharp({ create: { width: 160, height: 80, channels: 3, background: '#ff0000' } })
    .composite([{ input: { create: { width: 80, height: 80, channels: 3, background: '#0000ff' } }, left: 80, top: 0 }]);
  for (const orientation of [6, 8, null]) {
    const source = orientation ? redAndBlue().withMetadata({ orientation }) : redAndBlue();
    const input = await source.jpeg({ quality: 95 }).toBuffer();
    const normalized = await avatar.normalizeAvatar(`data:image/jpeg;base64,${input.toString('base64')}`);
    const output = Buffer.from(normalized.split(',')[1], 'base64');
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, orientation ? 80 : 160);
    assert.equal(metadata.height, orientation ? 160 : 80);
    assert.equal(metadata.orientation, undefined);
    assert.ok(output.length <= avatar.MAX_AVATAR_BYTES);
    const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const offset = (20 * info.width + (orientation ? 40 : 20)) * info.channels;
    // Orientation 6 moves the red left half to the top; orientation 8 moves the
    // blue right half there. Input without EXIF keeps the red half on the left.
    if (orientation === 8) assert.ok(data[offset + 2] > 200 && data[offset] < 50);
    else assert.ok(data[offset] > 200 && data[offset + 2] < 50);
  }
});

test('custom PROFILE_ROOT unifies account files, trash moves and quota accounting', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'profile-root-fixture.js')], { encoding: 'utf8', env: process.env });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /custom profile root: profile, avatar, trash and quota agree/);
});
