const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const iconv = require('iconv-lite');
const unzipper = require('unzipper');

const LIMITS = Object.freeze({
  archiveBytes: 50 * 1024 * 1024,
  fileCount: 100,
  totalBytes: 200 * 1024 * 1024,
  singleFileBytes: 50 * 1024 * 1024,
  compressionRatio: 40,
  directoryDepth: 6,
  extractionTimeoutMs: 30 * 1000,
  maxQueuedJobs: 3
});

let extractionQueue = Promise.resolve();
let pendingJobs = 0;

function archiveError(message, code = 'ARCHIVE_LIMIT') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function safeSegments(entryPath) {
  const normalized = String(entryPath || '').replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) throw archiveError('压缩包包含危险的绝对路径');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length || segments.some(segment => segment === '.' || segment === '..')) throw archiveError('压缩包包含危险的目录跳转路径');
  if (segments.length > LIMITS.directoryDepth) throw archiveError(`压缩包目录层级不能超过 ${LIMITS.directoryDepth} 层`);
  return segments.map(segment => segment
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 80) || '未命名');
}

function isSymlink(entry) {
  const attributes = Number(entry.externalFileAttributes || 0);
  const unixMode = (attributes >>> 16) & 0xF000;
  return unixMode === 0xA000;
}

function decodedEntryPath(entry) {
  const raw = Buffer.isBuffer(entry.pathBuffer) ? entry.pathBuffer : null;
  if (!raw || !raw.length) return String(entry.path || '');
  const flags = Number(entry.flags || (entry.vars && entry.vars.flags) || 0);
  if (entry.isUnicode || (flags & 0x800) === 0x800) return raw.toString('utf8');
  if (raw.every(byte => byte < 0x80)) return raw.toString('ascii');
  const gbk = iconv.decode(raw, 'gbk');
  return gbk && !gbk.includes('\uFFFD') ? gbk : String(entry.path || '');
}

function mimeType(filename) {
  const extension = path.extname(String(filename || '')).toLowerCase();
  const types = {
    '.txt': 'text/plain', '.md': 'text/markdown', '.html': 'text/html', '.htm': 'text/html',
    '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return types[extension] || 'application/octet-stream';
}

function uniqueDisplayName(archiveName, segments, usedNames) {
  const archiveBase = path.basename(archiveName, path.extname(archiveName)).slice(0, 55) || '压缩包';
  const joined = segments.join('_');
  const entry = path.parse(joined);
  const extension = entry.ext.slice(0, 16);
  const parsed = path.parse(`${archiveBase}_解压_${entry.name}`.slice(0, 180 - extension.length) + extension);
  let candidate = `${parsed.name}${parsed.ext}`;
  let index = 1;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${parsed.name.slice(0, 165)}_${index}${parsed.ext}`;
    index += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function extractZipNow({ archivePath, archiveName, targetDirectory, parentClientFileId, usedNames }) {
  const archiveStat = await fsp.stat(archivePath);
  if (archiveStat.size > LIMITS.archiveBytes) throw archiveError('ZIP 不能超过 50MB');

  const opened = await unzipper.Open.file(archivePath);
  const candidates = [];
  let totalBytes = 0;
  let totalCompressedBytes = 0;

  for (const entry of opened.files) {
    if (entry.type === 'Directory') continue;
    const entryPath = decodedEntryPath(entry);
    const segments = safeSegments(entryPath);
    if (segments[0] === '__MACOSX' || segments.at(-1) === '.DS_Store') continue;
    if (isSymlink(entry)) throw archiveError('压缩包不允许包含软链接');
    const flags = Number(entry.flags || (entry.vars && entry.vars.flags) || 0);
    if ((flags & 1) === 1) throw archiveError('暂不支持加密 ZIP');
    const size = Number(entry.uncompressedSize || (entry.vars && entry.vars.uncompressedSize)) || 0;
    const compressedSize = Number(entry.compressedSize || (entry.vars && entry.vars.compressedSize)) || 0;
    if (size > LIMITS.singleFileBytes) throw archiveError(`文件“${entryPath}”超过 50MB`);
    if (compressedSize > 0 && size / compressedSize > LIMITS.compressionRatio) throw archiveError(`文件“${entryPath}”压缩比过高`);
    totalBytes += size;
    totalCompressedBytes += compressedSize;
    candidates.push({ entry, entryPath, segments, size });
  }

  if (!candidates.length) throw archiveError('ZIP 中没有可解压的文件');
  if (candidates.length > LIMITS.fileCount) throw archiveError(`ZIP 最多包含 ${LIMITS.fileCount} 个文件`);
  if (totalBytes > LIMITS.totalBytes) throw archiveError('ZIP 解压后总大小不能超过 200MB');
  if (totalCompressedBytes > 0 && totalBytes / totalCompressedBytes > LIMITS.compressionRatio) throw archiveError('ZIP 总压缩比过高，已拒绝解压');

  const startedAt = Date.now();
  let writtenTotal = 0;
  const createdPaths = [];
  const extracted = [];
  try {
    for (let index = 0; index < candidates.length; index += 1) {
      if (Date.now() - startedAt > LIMITS.extractionTimeoutMs) throw archiveError('在线解压超过 30 秒，已停止');
      const candidate = candidates[index];
      const displayName = uniqueDisplayName(archiveName, candidate.segments, usedNames);
      const childId = `x_${crypto.createHash('sha256').update(`${parentClientFileId}:${candidate.entryPath}:${index}`).digest('hex').slice(0, 28)}`;
      const storedName = `${childId}-${displayName}`;
      const destination = path.join(targetDirectory, storedName);
      const source = candidate.entry.stream();
      let writtenFileBytes = 0;
      const sizeGuard = new Transform({
        transform(chunk, encoding, callback) {
          writtenFileBytes += chunk.length;
          if (writtenFileBytes > LIMITS.singleFileBytes) return callback(archiveError(`文件“${candidate.entryPath}”实际大小超过 50MB`));
          if (writtenTotal + writtenFileBytes > LIMITS.totalBytes) return callback(archiveError('ZIP 实际解压总大小超过 200MB'));
          callback(null, chunk);
        }
      });
      const remaining = Math.max(1000, LIMITS.extractionTimeoutMs - (Date.now() - startedAt));
      let timer;
      try {
        timer = setTimeout(() => source.destroy(archiveError('在线解压超过 30 秒，已停止')), remaining);
        await pipeline(source, sizeGuard, fs.createWriteStream(destination, { flags: 'wx' }));
      } finally {
        clearTimeout(timer);
      }
      createdPaths.push(destination);
      const actual = await fsp.stat(destination);
      writtenTotal += actual.size;
      extracted.push({
        clientFileId: childId,
        parentClientFileId,
        originalName: displayName,
        storedName,
        size: actual.size,
        mimeType: mimeType(displayName),
        archivePath: candidate.entryPath,
        extracted: true
      });
    }
    return extracted;
  } catch (error) {
    await Promise.all(createdPaths.map(file => fsp.rm(file, { force: true }).catch(() => {})));
    throw error;
  }
}

async function extractZip(options) {
  if (pendingJobs >= LIMITS.maxQueuedJobs) throw archiveError('服务器解压队列已满，请稍后再试', 'ARCHIVE_BUSY');
  pendingJobs += 1;
  const task = extractionQueue.then(() => extractZipNow(options));
  extractionQueue = task.catch(() => {});
  try {
    return await task;
  } finally {
    pendingJobs -= 1;
  }
}

module.exports = { LIMITS, extractZip };
