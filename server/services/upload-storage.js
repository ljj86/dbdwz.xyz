const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const multer = require('multer');
const { PROFILE_ROOT } = require('./profile-storage');

const MiB = 1024 * 1024;
function setting(name, fallback) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} 必须是正整数`);
  return value;
}
const LIMITS = Object.freeze({
  fileBytes: 500 * MiB,
  requestBytes: 600 * MiB,
  accountBytes: setting('MATERIAL_ACCOUNT_BYTES', 10 * 1024 * MiB),
  globalBytes: setting('MATERIAL_GLOBAL_BYTES', 100 * 1024 * MiB),
  freeBytes: setting('MATERIAL_MIN_FREE_BYTES', 1024 * MiB),
  accountUploads: 2, globalUploads: 8,
  accountFiles: 2000, globalFiles: 20000,
  accountTasks: 20, globalTasks: 200,
  accountMaterials: 200, globalMaterials: 2000,
  taskFiles: 200, materialFiles: 200
});
const resourceRoot = path.resolve(process.env.RESOURCE_ROOT || path.join(__dirname, '..', '..', '资源'));
const profileRoot = PROFILE_ROOT;
const stagingRoot = path.resolve(process.env.MATERIAL_STAGING_ROOT || path.join(os.tmpdir(), 'dbdwz-upload-staging'));
const incomingRoot = path.join(stagingRoot, '_incoming');
const reservations = new Map();
const userLocks = new Map();
const userPending = new Map();
const pendingQuotaByUser = new Map();
let pendingQuotaChecks = 0;
let pendingMutations = 0;
const activeIncoming = new Set();
let quotaLock = Promise.resolve();

function storageError(message, status = 413) {
  return Object.assign(new Error(message), { status, code: 'MATERIAL_STORAGE_LIMIT' });
}
function validSegment(value) {
  return typeof value === 'string' && value.length > 0 && value !== '.' && value !== '..' && !/[\/\\\x00]/.test(value);
}
async function directoryUsage(directory) {
  const result = { bytes: 0, files: 0 };
  const entries = await fsp.readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const child = await directoryUsage(target);
      result.bytes += child.bytes;
      result.files += child.files;
    } else if (entry.isFile()) {
      const stat = await fsp.stat(target).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (stat) { result.bytes += stat.size; result.files += 1; }
    }
  }
  return result;
}
function addUsage(target, value) {
  for (const key of ['bytes', 'files', 'tasks', 'materials']) target[key] += value[key] || 0;
}
function emptyUsage() { return { bytes: 0, files: 0, tasks: 0, materials: 0 }; }

// Ownership comes from database rows and numeric server-created staging directories,
// never from an uploaded manifest or metadata.json. Unknown files still cost global space.
async function storageUsage(userId, isCancelled = () => false) {
  const active = () => { if (isCancelled()) throw storageError('资料操作已取消', 400); };
  active();
  const { getPool } = require('../db');
  const [materials] = await getPool().query('SELECT id, folder, user_id FROM meeting_materials');
  active();
  const global = emptyUsage();
  const account = emptyUsage();
  const owners = new Map(materials.filter(row => validSegment(row.folder)).map(row => [row.folder, Number(row.user_id)]));
  const resourceEntries = await fsp.readdir(resourceRoot, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of resourceEntries) {
    active();
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const used = await directoryUsage(path.join(resourceRoot, entry.name));
    addUsage(global, used);
    if (owners.get(entry.name) === Number(userId)) addUsage(account, used);
  }
  for (const row of materials) {
    global.materials += 1;
    if (Number(row.user_id) === Number(userId)) account.materials += 1;
  }
  const profiles = await fsp.readdir(profileRoot, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of profiles) {
    active();
    if (!entry.isDirectory() || !/^user-[1-9]\d*$/.test(entry.name)) continue;
    const used = await directoryUsage(path.join(profileRoot, entry.name, 'deleted'));
    addUsage(global, used);
    if (Number(entry.name.slice(5)) === Number(userId)) addUsage(account, used);
  }
  const users = await fsp.readdir(stagingRoot, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of users) {
    active();
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (entry.name === '_incoming') {
      const incomingUsers = await fsp.readdir(incomingRoot, { withFileTypes: true });
      for (const incomingUser of incomingUsers) {
        if (!incomingUser.isDirectory() || !/^[1-9]\d*$/.test(incomingUser.name)) continue;
        const used = await directoryUsage(path.join(incomingRoot, incomingUser.name));
        addUsage(global, used);
        if (Number(incomingUser.name) === Number(userId)) addUsage(account, used);
      }
      continue;
    }
    const used = await directoryUsage(path.join(stagingRoot, entry.name));
    if (/^[1-9]\d*$/.test(entry.name)) {
      const tasks = await fsp.readdir(path.join(stagingRoot, entry.name), { withFileTypes: true });
      used.tasks = tasks.filter(item => item.isDirectory()).length;
    }
    addUsage(global, used);
    if (Number(entry.name) === Number(userId)) addUsage(account, used);
  }
  return { global, account };
}
function serialized(callback) {
  const operation = quotaLock.then(callback);
  quotaLock = operation.catch(() => {});
  return operation;
}
async function checkFreeSpace(bytes) {
  for (const root of new Set([resourceRoot, stagingRoot, profileRoot, os.tmpdir()])) {
    await fsp.mkdir(root, { recursive: true });
    const stat = await fsp.statfs(root);
    if (Number(stat.bavail) * Number(stat.bsize) < bytes + LIMITS.freeBytes) {
      throw storageError('存储空间不足，请联系管理员', 507);
    }
  }
}
async function reserveStorage(userId, requested = {}) {
  const owner = Number(userId);
  if (!Number.isSafeInteger(owner) || owner <= 0) throw storageError('上传用户无效', 401);
  // Admission must happen before the first await/queued database scan. Otherwise
  // attackers can accumulate arbitrarily many closures even without file bodies.
  if ((pendingQuotaByUser.get(owner) || 0) >= 4 || pendingQuotaChecks >= 32) throw storageError('存储检查繁忙，请稍后重试', 429);
  pendingQuotaByUser.set(owner, (pendingQuotaByUser.get(owner) || 0) + 1);
  pendingQuotaChecks += 1;
  try {
    return await serialized(async () => {
    const request = { userId: Number(userId), bytes: 0, files: 0, tasks: 0, materials: 0, upload: false, ...requested };
    const isCancelled = typeof requested.isCancelled === 'function' ? requested.isCancelled : () => false;
    if (isCancelled()) throw storageError('资料操作已取消', 400);
    if (!Number.isSafeInteger(request.userId) || request.userId <= 0) throw storageError('上传用户无效', 401);
    for (const key of ['bytes', 'files', 'tasks', 'materials']) {
      if (!Number.isSafeInteger(request[key]) || request[key] < 0) throw storageError('存储预留参数无效', 400);
    }
    const { global, account } = await storageUsage(userId, isCancelled);
    let globalUploads = 0;
    let accountUploads = 0;
    let physicalReservedBytes = 0;
    for (const reservation of reservations.values()) {
      physicalReservedBytes += reservation.bytes;
      addUsage(global, reservation);
      if (reservation.userId === request.userId) addUsage(account, reservation);
      if (reservation.upload) {
        globalUploads += 1;
        if (reservation.userId === request.userId) accountUploads += 1;
      }
    }
    if (request.upload && (globalUploads >= LIMITS.globalUploads || accountUploads >= LIMITS.accountUploads)) {
      throw storageError('同时上传数量已达上限，请稍后重试', 429);
    }
    for (const [key, suffix] of [['bytes', 'Bytes'], ['files', 'Files'], ['tasks', 'Tasks'], ['materials', 'Materials']]) {
      if (global[key] + request[key] > LIMITS[`global${suffix}`] || account[key] + request[key] > LIMITS[`account${suffix}`]) {
        throw storageError('资料存储配额已满，请清理临时区或永久删除不再需要的资料');
      }
    }
    await checkFreeSpace(physicalReservedBytes + request.bytes);
    if (isCancelled()) throw storageError('资料操作已取消', 400);
    const id = crypto.randomUUID();
    reservations.set(id, request);
    return { release() { reservations.delete(id); } };
    });
  } finally {
    pendingQuotaByUser.set(owner, pendingQuotaByUser.get(owner) - 1);
    if (!pendingQuotaByUser.get(owner)) pendingQuotaByUser.delete(owner);
    pendingQuotaChecks -= 1;
  }
}
async function withUserLock(userId, callback) {
  const key = String(userId);
  if ((userPending.get(key) || 0) >= 4 || pendingMutations >= 32) throw storageError('资料操作过多，请稍后重试', 429);
  userPending.set(key, (userPending.get(key) || 0) + 1);
  pendingMutations += 1;
  const previous = userLocks.get(key) || Promise.resolve();
  const operation = previous.then(callback);
  const settled = operation.catch(() => {});
  userLocks.set(key, settled);
  try { return await operation; }
  finally {
    userPending.set(key, userPending.get(key) - 1);
    if (!userPending.get(key)) userPending.delete(key);
    pendingMutations -= 1;
    if (userLocks.get(key) === settled) userLocks.delete(key);
  }
}

function createDiskStorage() {
  return {
    _handleFile(req, file, callback) {
      const target = path.join(req.materialUploadDirectory, crypto.randomUUID());
      let size = 0;
      const guard = new Transform({ transform(chunk, encoding, done) {
        size += chunk.length;
        req.materialUploadBytes += chunk.length;
        if (size > LIMITS.fileBytes || req.materialUploadBytes > LIMITS.requestBytes) return done(storageError('单个文件不能超过 500MiB，一次请求不能超过 600MiB'));
        done(null, chunk);
      } });
      const aborted = () => file.stream.destroy(storageError('上传已取消', 400));
      req.once('aborted', aborted);
      pipeline(file.stream, guard, fs.createWriteStream(target, { flags: 'wx', highWaterMark: 64 * 1024 }))
        .then(() => callback(null, { path: target, size }))
        .catch(async error => { await fsp.rm(target, { force: true }).catch(() => {}); callback(error); })
        .finally(() => req.removeListener('aborted', aborted));
    },
    _removeFile(req, file, callback) {
      fsp.rm(file.path, { force: true }).then(() => callback(null), callback);
    }
  };
}
function materialUpload(field, multiple = false) {
  const parser = multer({ storage: createDiskStorage(), limits: {
    fileSize: LIMITS.fileBytes + 1, files: multiple ? 50 : 1,
    fields: 10, fieldSize: 64 * 1024, parts: 62, fieldNameSize: 100
  } });
  const parse = multiple ? parser.array(field, 50) : parser.single(field);
  return async (req, res, next) => {
    let reservation;
    let directory;
    let cleaning;
    const cleanup = () => {
      // A disconnected response does not stop asynchronous disk operations. Keep
      // the lease and reservation until Multer and the owning route have settled.
      if (req.materialUploadParsing || (req.materialUploadParsed && !req.materialMutationSettled)) return Promise.resolve();
      if (!cleaning) cleaning = (async () => {
        if (directory) await fsp.rm(directory, { recursive: true, force: true }).catch(() => {});
        if (directory) activeIncoming.delete(directory);
        if (reservation) reservation.release();
      })();
      return cleaning;
    };
    try {
      const length = Number(req.headers['content-length']);
      if (Number.isFinite(length) && length > LIMITS.requestBytes + 1024 * 1024) throw storageError('一次请求不能超过 600MiB');
      const bytes = Number.isSafeInteger(length) && length > 0 ? Math.min(length, LIMITS.requestBytes) : LIMITS.requestBytes;
      reservation = await reserveStorage(req.user.id, { bytes, files: multiple ? 50 : 1, tasks: 1, upload: true, isCancelled: () => req.aborted || res.destroyed });
      const userDirectory = path.join(incomingRoot, String(req.user.id));
      await fsp.mkdir(userDirectory, { recursive: true });
      directory = await fsp.mkdtemp(path.join(userDirectory, 'upload-'));
      activeIncoming.add(directory);
      await fsp.writeFile(path.join(directory, 'lease.json'), JSON.stringify({ type: 'dbdwz-incoming-v1', userId: Number(req.user.id), createdAt: new Date().toISOString() }));
      req.materialUploadDirectory = directory;
      req.materialUploadBytes = 0;
      req.materialUploadCleanup = cleanup;
      req.materialUploadParsing = true;
      res.once('finish', cleanup);
      res.once('close', cleanup);
      if (req.aborted || res.destroyed) { req.materialUploadParsing = false; await cleanup(); return; }
      req.setTimeout(10 * 60 * 1000, () => req.destroy());
      parse(req, res, error => {
        req.materialUploadParsing = false;
        if (!error) {
          req.materialUploadParsed = true;
          return next();
        }
        cleanup().then(() => {
          if (res.destroyed || res.headersSent) return;
          const status = error.status || (error instanceof multer.MulterError ? 413 : 400);
          res.status(status).json({ code: status, message: error instanceof multer.MulterError ? '上传超过文件、数量或表单限制' : error.message });
        }).catch(next);
      });
    } catch (error) {
      req.materialUploadParsing = false;
      await cleanup();
      if (!res.destroyed) res.status(error.status || 500).json({ code: error.status || 500, message: error.status ? error.message : '无法预留上传空间' });
    }
  };
}
async function cleanupExpiredIncoming() {
  const users = await fsp.readdir(incomingRoot, { withFileTypes: true }).catch(() => []);
  for (const user of users) {
    if (!user.isDirectory() || !/^[1-9]\d*$/.test(user.name)) continue;
    const root = path.join(incomingRoot, user.name);
    const directories = await fsp.readdir(root, { withFileTypes: true });
    for (const entry of directories) {
      if (!entry.isDirectory() || !/^upload-[a-zA-Z0-9]+$/.test(entry.name)) continue;
      const directory = path.join(root, entry.name);
      if (activeIncoming.has(directory)) continue;
      const lease = await fsp.readFile(path.join(directory, 'lease.json'), 'utf8').then(JSON.parse).catch(() => null);
      const created = lease && Date.parse(lease.createdAt);
      if (lease && lease.type === 'dbdwz-incoming-v1' && lease.userId === Number(user.name) && Number.isFinite(created) && Date.now() - created > 6 * 60 * 60 * 1000) {
        await fsp.rm(directory, { recursive: true, force: true });
      }
    }
  }
}
module.exports = { LIMITS, resourceRoot, profileRoot, stagingRoot, storageError, directoryUsage, storageUsage, reserveStorage, withUserLock, materialUpload, createDiskStorage, cleanupExpiredIncoming };
