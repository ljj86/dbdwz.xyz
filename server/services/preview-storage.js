const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { reserveStorage, directoryUsage, storageError } = require('./upload-storage');

const execFileAsync = promisify(execFile);
const resourceRoot = path.resolve(process.env.RESOURCE_ROOT || path.join(__dirname, '..', '..', '资源'));
const cacheDirectoryName = '_preview';
const queue = [];
const queuedKeys = new Set();
const idleWaiters = [];
const capacityWaiters = [];
const queueOwners = new Map();
const pendingSchedules = new Set();
const schedulingFences = new Map();
const PREVIEW_LIMITS = Object.freeze({ globalJobs: 64, accountJobs: 8, inputBytes: 500 * 1024 * 1024, outputBytes: 500 * 1024 * 1024 });
let running = false;
let lastOwner = null;
let activeTask = null;

function previewTimeout(name, fallback) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1000 || value > 1800000) throw new Error(`${name} 必须为 1000-1800000 毫秒`);
  return value;
}
async function runConverter(binary, args, options) {
  let executable = binary;
  let argumentsList = args;
  if (process.platform === 'linux') {
    // Inherit hard memory, CPU and output-file limits in converter descendants.
    executable = '/usr/bin/prlimit';
    argumentsList = ['--as=2147483648', `--cpu=${Math.ceil(options.timeout / 1000)}`, `--fsize=${PREVIEW_LIMITS.outputBytes}`, '--', binary, ...args];
  }
  const operation = execFileAsync(executable, argumentsList, { maxBuffer: options.maxBuffer, windowsHide: true, detached: process.platform !== 'win32' });
  let stopping;
  const stop = () => {
    if (!stopping) {
      if (process.platform === 'win32') stopping = execFileAsync('taskkill.exe', ['/PID', String(operation.child.pid), '/T', '/F'], { windowsHide: true }).catch(() => {});
      else {
        try { process.kill(-operation.child.pid, 'SIGKILL'); } catch { operation.child.kill('SIGKILL'); }
        stopping = Promise.resolve();
      }
    }
    return stopping;
  };
  if (options.task) {
    options.task.stopConverter = stop;
    if (options.task.cancelled) stop();
  }
  const deadline = setTimeout(stop, options.timeout);
  let exceeded = false;
  let checking = false;
  const monitor = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
      if ((await directoryUsage(options.outputDirectory)).bytes > PREVIEW_LIMITS.outputBytes) {
        exceeded = true;
        stop();
      }
    } catch { stop(); }
    finally { checking = false; }
  }, 200);
  try {
    await operation;
    if (exceeded || (await directoryUsage(options.outputDirectory)).bytes > PREVIEW_LIMITS.outputBytes) throw storageError('预览输出超过 500MiB');
  } catch (error) {
    await stop();
    throw error;
  } finally {
    clearInterval(monitor);
    clearTimeout(deadline);
    if (stopping) await stopping;
    if (options.task) options.task.stopConverter = null;
  }
}

function resolveExecutable(configured, candidates, fallback) {
  if (configured) return configured;
  for (const candidate of candidates) {
    try {
      if (require('fs').existsSync(candidate)) return candidate;
    } catch {}
  }
  return fallback;
}

function libreOfficeBinary() {
  if (process.platform !== 'win32') {
    return resolveExecutable(process.env.LIBREOFFICE_BIN, [
      '/usr/bin/libreoffice',
      '/usr/local/bin/libreoffice',
      '/snap/bin/libreoffice'
    ], 'libreoffice');
  }
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  return resolveExecutable(process.env.LIBREOFFICE_BIN, [
    path.join(programFiles, 'LibreOffice', 'program', 'soffice.exe'),
    path.join(programFilesX86, 'LibreOffice', 'program', 'soffice.exe'),
    localAppData && path.join(localAppData, 'Programs', 'LibreOffice', 'program', 'soffice.exe')
  ].filter(Boolean), '');
}

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif']);
const browserVideoExtensions = new Set(['.mp4', '.webm', '.ogv', '.m4v']);
const convertedVideoExtensions = new Set(['.mov', '.mkv', '.avi', '.wmv', '.flv', '.mpg', '.mpeg', '.3gp', '.ts', '.m2ts']);
const audioExtensions = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.oga', '.opus']);
const officeExtensions = new Set(['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.ods', '.odp']);
const markdownExtensions = new Set(['.md', '.markdown']);
const latexExtensions = new Set(['.tex', '.latex', '.ltx']);
const htmlExtensions = new Set(['.html', '.htm']);
const codeExtensions = new Set([
  '.py', '.pyw', '.c', '.h', '.cc', '.cpp', '.cxx', '.hpp', '.java', '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx', '.vue', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.sql',
  '.sh', '.bash', '.ps1', '.bat', '.cmd', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.kts', '.cs',
  '.toml', '.ini', '.conf'
]);
const textExtensions = new Set(['.txt', '.log', '.csv', '.tsv', '.properties', '.env']);

function cleanName(value) {
  const name = path.basename(String(value || ''));
  if (!name || name === '.' || name === '..') throw new Error('文件名无效');
  return name;
}

function cleanFolder(value) {
  const folder = path.basename(String(value || ''));
  if (!folder || folder === '.' || folder === '..') throw new Error('资料目录无效');
  return folder;
}

function classifyFile(filename) {
  const lower = String(filename || '').toLowerCase();
  const extension = path.extname(lower);
  if (extension === '.pdf') return { kind: 'pdf', mode: 'direct' };
  if (imageExtensions.has(extension)) return { kind: 'image', mode: 'direct' };
  if (browserVideoExtensions.has(extension)) return { kind: 'video', mode: 'direct' };
  if (convertedVideoExtensions.has(extension)) return { kind: 'video', mode: 'ffmpeg', outputExtension: '.mp4' };
  if (audioExtensions.has(extension)) return { kind: 'audio', mode: 'direct' };
  if (officeExtensions.has(extension)) return { kind: 'pdf', mode: 'libreoffice', outputExtension: '.pdf' };
  if (markdownExtensions.has(extension)) return { kind: 'markdown', mode: 'text' };
  if (latexExtensions.has(extension)) return { kind: 'latex', mode: 'text' };
  if (htmlExtensions.has(extension)) return { kind: 'html', mode: 'direct' };
  if (codeExtensions.has(extension) || lower === 'dockerfile' || lower === 'makefile') {
    return { kind: 'code', mode: 'text', language: extension.slice(1) || lower };
  }
  if (textExtensions.has(extension)) return { kind: 'text', mode: 'text' };
  return { kind: 'unsupported', mode: 'unsupported' };
}

function keyFor(filename) {
  return crypto.createHash('sha256').update(filename).digest('hex').slice(0, 32);
}

function folderPaths(folderName, filename) {
  const folder = cleanFolder(folderName);
  const name = cleanName(filename);
  const folderPath = path.join(resourceRoot, folder);
  const cachePath = path.join(folderPath, cacheDirectoryName);
  const key = keyFor(name);
  return {
    folder,
    name,
    folderPath,
    sourcePath: path.join(folderPath, name),
    cachePath,
    statePath: path.join(cachePath, `${key}.json`),
    key
  };
}

async function sourceDescriptor(folderName, filename) {
  const paths = folderPaths(folderName, filename);
  const stat = await fs.stat(paths.sourcePath);
  if (!stat.isFile()) throw new Error('预览源不是文件');
  return {
    ...paths,
    size: stat.size,
    mtimeMs: Math.round(stat.mtimeMs),
    // 复制或迁移可能截断亚秒时间，按整秒匹配已有预览缓存。
    mtimeSeconds: Math.floor(stat.mtimeMs / 1000),
    signature: `${stat.size}:${Math.floor(stat.mtimeMs / 1000)}`,
    classification: classifyFile(paths.name)
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function writeState(descriptor, state) {
  await fs.mkdir(descriptor.cachePath, { recursive: true });
  const complete = {
    version: 1,
    folder: descriptor.folder,
    filename: descriptor.name,
    signature: descriptor.signature,
    size: descriptor.size,
    kind: descriptor.classification.kind,
    mode: descriptor.classification.mode,
    language: descriptor.classification.language || '',
    updatedAt: new Date().toISOString(),
    ...state
  };
  const temporary = `${descriptor.statePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(complete, null, 2)}\n`, 'utf8');
  await fs.rm(descriptor.statePath, { force: true });
  await fs.rename(temporary, descriptor.statePath);
  return complete;
}

async function outputExists(descriptor, state) {
  if (!state.outputFile) return true;
  try {
    const stat = await fs.stat(path.join(descriptor.cachePath, path.basename(state.outputFile)));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function notifyIdle() {
  if (running || queue.length) return;
  while (idleWaiters.length) idleWaiters.shift()();
}

async function convertOffice(descriptor, outputFile, task) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dbdwz-office-'));
  const outputDirectory = path.join(temporaryRoot, 'out');
  const profileDirectory = path.join(temporaryRoot, 'profile');
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.mkdir(profileDirectory, { recursive: true });
    const binary = libreOfficeBinary();
    if (binary) {
      await runConverter(binary, [
        `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
        '--headless', '--nologo', '--nodefault', '--norestore',
        '--convert-to', 'pdf', '--outdir', outputDirectory, descriptor.sourcePath
      ], {
        timeout: previewTimeout('OFFICE_PREVIEW_TIMEOUT_MS', 240000),
        outputDirectory: temporaryRoot,
        task,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
      });
    } else if (process.platform === 'win32') {
      const generated = path.join(outputDirectory, `${path.parse(descriptor.name).name}.pdf`);
      const helper = path.join(__dirname, '..', 'scripts', 'convert-office-windows.ps1');
      await runConverter('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', helper, descriptor.sourcePath, generated
      ], {
        timeout: previewTimeout('OFFICE_PREVIEW_TIMEOUT_MS', 240000),
        outputDirectory: temporaryRoot,
        task,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
      });
    } else {
      throw Object.assign(new Error('未找到 LibreOffice 可执行文件'), { code: 'ENOENT' });
    }
    const generatedFiles = (await fs.readdir(outputDirectory)).filter((name) => path.extname(name).toLowerCase() === '.pdf');
    if (generatedFiles.length !== 1) throw new Error(`LibreOffice 未生成唯一 PDF（实际 ${generatedFiles.length} 个）`);
    const generated = path.join(outputDirectory, generatedFiles[0]);
    const stat = await fs.stat(generated);
    if (task.cancelled) return;
    if (!stat.size) throw new Error('LibreOffice 生成了空 PDF');
    if (stat.size > PREVIEW_LIMITS.outputBytes) throw storageError('预览输出超过 500MiB');
    await fs.mkdir(descriptor.cachePath, { recursive: true });
    await fs.rm(path.join(descriptor.cachePath, outputFile), { force: true });
    await fs.copyFile(generated, path.join(descriptor.cachePath, outputFile));
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function convertVideo(descriptor, outputFile, task) {
  await fs.mkdir(descriptor.cachePath, { recursive: true });
  const target = path.join(descriptor.cachePath, outputFile);
  const temporaryRoot = await fs.mkdtemp(path.join(descriptor.cachePath, '.job-'));
  const temporary = path.join(temporaryRoot, outputFile);
  const binary = process.env.FFMPEG_BIN || 'ffmpeg';
  try {
    await runConverter(binary, [
      '-y', '-i', descriptor.sourcePath,
      '-map', '0:v:0?', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p', '-threads', '1',
      '-c:a', 'aac', '-b:a', '128k', '-fs', String(PREVIEW_LIMITS.outputBytes), '-movflags', '+faststart', temporary
    ], {
      timeout: previewTimeout('VIDEO_PREVIEW_TIMEOUT_MS', 300000),
      outputDirectory: temporaryRoot,
      task,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    });
    const stat = await fs.stat(temporary);
    if (task.cancelled) return;
    if (!stat.size) throw new Error('FFmpeg 生成了空视频');
    await fs.rm(target, { force: true });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function processTask(task) {
  let descriptor;
  let reservation;
  try {
    descriptor = await sourceDescriptor(task.folder, task.filename);
    if (descriptor.size > PREVIEW_LIMITS.inputBytes) throw storageError('预览输入超过 500MiB，请下载查看');
    reservation = await reserveStorage(task.userId, { bytes: PREVIEW_LIMITS.outputBytes * 2, files: 10, isCancelled: () => task.cancelled });
    const outputFile = `${descriptor.key}${descriptor.classification.outputExtension || ''}`;
    // 转换工具没有可靠的逐文件百分比回调，不伪造中间进度；只报告处理中和完成。
    if (task.cancelled) return;
    await writeState(descriptor, { status: 'processing', progress: 0, outputFile });
    if (task.cancelled) return;
    if (descriptor.classification.mode === 'libreoffice') await convertOffice(descriptor, outputFile, task);
    else if (descriptor.classification.mode === 'ffmpeg') await convertVideo(descriptor, outputFile, task);
    if (!task.cancelled) await writeState(descriptor, { status: 'ready', progress: 100, outputFile, error: '' });
  } catch (error) {
    if (descriptor && descriptor.classification.mode === 'libreoffice' && error && error.code === 'ENOENT') {
      error.message = '未找到 Office 转换程序。Linux 请安装 LibreOffice；Windows 请安装 LibreOffice 或 WPS，并可通过 LIBREOFFICE_BIN 指定完整路径';
    }
    if (descriptor && !task.cancelled) {
      await writeState(descriptor, {
        status: 'failed', progress: 0,
        error: String(error && error.message ? error.message : error).slice(0, 1000)
      }).catch(() => {});
    }
    console.error(`[preview] ${task.folder}/${task.filename}:`, error.message || error);
  } finally {
    if (descriptor && task.cancelled) {
      await fs.rm(descriptor.statePath, { force: true }).catch(() => {});
      await fs.rm(path.join(descriptor.cachePath, `${descriptor.key}${descriptor.classification.outputExtension || ''}`), { force: true }).catch(() => {});
    }
    if (reservation) reservation.release();
  }
}

async function drainQueue() {
  if (running) return;
  running = true;
  while (queue.length) {
    const next = queue.findIndex(task => task.userId !== lastOwner);
    const task = queue.splice(next < 0 ? 0 : next, 1)[0];
    activeTask = task;
    lastOwner = task.userId;
    try {
      await processTask(task);
    } finally {
      queuedKeys.delete(task.queueKey);
      queueOwners.delete(task.queueKey);
      activeTask = null;
      task.resolveSettled();
      while (capacityWaiters.length) capacityWaiters.shift()();
    }
  }
  running = false;
  notifyIdle();
}

function enqueue(folder, filename, userId, queueKey) {
  let resolveSettled;
  const settled = new Promise(resolve => { resolveSettled = resolve; });
  queue.push({ folder, filename, userId, queueKey, settled, resolveSettled });
  setImmediate(() => drainQueue().catch((error) => console.error('[preview queue]', error)));
}

function scheduleFilePreview(folderName, filename, options = {}) {
  const context = { folder: cleanFolder(folderName), filename: cleanName(filename), cancelled: false };
  if (schedulingFences.has(context.folder) || schedulingFences.has(`${context.folder}\u0000${context.filename}`)) return Promise.reject(new Error('资料正在移动或删除'));
  pendingSchedules.add(context);
  context.settled = scheduleFilePreviewNow(folderName, filename, options, context).finally(async () => {
    if (context.cancelled) await fs.rm(folderPaths(context.folder, context.filename).statePath, { force: true }).catch(() => {});
    pendingSchedules.delete(context);
  });
  return context.settled;
}
async function scheduleFilePreviewNow(folderName, filename, options, context) {
  const descriptor = await sourceDescriptor(folderName, filename);
  if (context.cancelled) throw new Error('预览任务已取消');
  const existing = await readJson(descriptor.statePath);
  if (!options.force && existing && existing.signature === descriptor.signature && existing.status === 'ready' && await outputExists(descriptor, existing)) {
    return existing;
  }
  if (['direct', 'text', 'unsupported'].includes(descriptor.classification.mode)) {
    const state = await writeState(descriptor, {
      status: descriptor.classification.mode === 'unsupported' ? 'unsupported' : 'ready',
      progress: 100,
      outputFile: '',
      error: ''
    });
    if (context.cancelled) throw new Error('预览任务已取消');
    return state;
  }
  const userId = Number(options.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('预览任务缺少有效用户');
  const queueKey = `${descriptor.folder}\u0000${descriptor.name}`;
  if (queuedKeys.has(queueKey)) return existing || { status: 'queued', progress: 0 };
  const full = () => queuedKeys.size >= PREVIEW_LIMITS.globalJobs || [...queueOwners.values()].filter(owner => owner === userId).length >= PREVIEW_LIMITS.accountJobs;
  while (full()) {
    if (context.cancelled) throw new Error('预览任务已取消');
    if (!options.waitForCapacity) return writeState(descriptor, { status: 'failed', progress: 0, error: '预览队列已满，原文件已保存；请稍后补建预览' });
    await new Promise(resolve => capacityWaiters.push(resolve));
  }
  if (context.cancelled) throw new Error('预览任务已取消');
  // Reserve synchronously before the asynchronous state write; concurrent callers
  // cannot all observe the same free slot.
  queuedKeys.add(queueKey);
  queueOwners.set(queueKey, userId);
  const outputFile = `${descriptor.key}${descriptor.classification.outputExtension}`;
  try {
    const state = await writeState(descriptor, { status: 'queued', progress: 0, outputFile, userId, error: '' });
    if (context.cancelled) throw new Error('预览任务已取消');
    enqueue(descriptor.folder, descriptor.name, userId, queueKey);
    return state;
  } catch (error) {
    queuedKeys.delete(queueKey);
    queueOwners.delete(queueKey);
    while (capacityWaiters.length) capacityWaiters.shift()();
    throw error;
  }
}

async function scheduleMaterialPreviews(folderName, files, options = {}) {
  const names = files.map((file) => cleanName(typeof file === 'string' ? file : file.name)).filter(Boolean);
  const results = [];
  for (const filename of names) {
    try {
      results.push(await scheduleFilePreview(folderName, filename, options));
    } catch (error) {
      console.error(`[preview schedule] ${folderName}/${filename}:`, error.message || error);
    }
  }
  return results;
}

async function getPreviewState(folderName, filename) {
  const descriptor = await sourceDescriptor(folderName, filename);
  const state = await readJson(descriptor.statePath);
  if (!state || state.signature !== descriptor.signature) {
    return {
      status: 'missing', progress: 0, filename: descriptor.name,
      kind: descriptor.classification.kind, mode: descriptor.classification.mode,
      language: descriptor.classification.language || ''
    };
  }
  if (state.status === 'ready' && !(await outputExists(descriptor, state))) return { ...state, status: 'missing' };
  return state;
}

async function removeFilePreview(folderName, filename) {
  const release = await cancelMaterialPreviews(folderName, [filename]);
  try {
  const paths = folderPaths(folderName, filename);
  const state = await readJson(paths.statePath);
  if (state && state.outputFile) await fs.rm(path.join(paths.cachePath, path.basename(state.outputFile)), { force: true });
  const extension = classifyFile(paths.name).outputExtension;
  if (extension) await fs.rm(path.join(paths.cachePath, `${paths.key}${extension}`), { force: true });
  await fs.rm(paths.statePath, { force: true });
  } finally { release(); }
}

async function cancelMaterialPreviews(folderName, filenames = null) {
  const folder = cleanFolder(folderName);
  const names = filenames && new Set(filenames.map(cleanName));
  const keys = names ? [...names].map(name => `${folder}\u0000${name}`) : [folder];
  for (const key of keys) schedulingFences.set(key, (schedulingFences.get(key) || 0) + 1);
  const matches = task => task.folder === folder && (!names || names.has(task.filename));
  const waits = [];
  for (const context of pendingSchedules) {
    if (matches(context)) { context.cancelled = true; waits.push(context.settled); }
  }
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const task = queue[index];
    if (!matches(task)) continue;
    queue.splice(index, 1);
    queuedKeys.delete(task.queueKey);
    queueOwners.delete(task.queueKey);
    task.resolveSettled();
    waits.push(fs.rm(folderPaths(task.folder, task.filename).statePath, { force: true }));
  }
  if (activeTask && matches(activeTask)) {
    activeTask.cancelled = true;
    if (activeTask.stopConverter) activeTask.stopConverter();
    waits.push(activeTask.settled);
  }
  while (capacityWaiters.length) capacityWaiters.shift()();
  await Promise.allSettled(waits);
  notifyIdle();
  return () => {
    for (const key of keys) {
      const remaining = schedulingFences.get(key) - 1;
      if (remaining) schedulingFences.set(key, remaining);
      else schedulingFences.delete(key);
    }
  };
}

async function backfillAllPreviews(options = {}) {
  const { getPool } = require('../db');
  const [files] = await getPool().query('SELECT m.folder, m.user_id, f.filename FROM meeting_materials m JOIN meeting_material_files f ON f.material_id = m.id WHERE m.is_published = 1 ORDER BY m.id, f.id');
  let count = 0;
  for (const file of files) {
    await scheduleMaterialPreviews(file.folder, [file.filename], { ...options, userId: file.user_id, waitForCapacity: true });
    count += 1;
  }
  return count;
}

async function resumePendingPreviews() {
  // Feed durable jobs with bounded admission without blocking HTTP startup.
  (async () => {
    const { getPool } = require('../db');
    const [files] = await getPool().query('SELECT m.folder, m.user_id, f.filename FROM meeting_materials m JOIN meeting_material_files f ON f.material_id = m.id WHERE m.is_published = 1 ORDER BY m.id, f.id');
    for (const file of files) {
      const descriptor = await sourceDescriptor(file.folder, file.filename).catch(() => null);
      if (!descriptor) continue;
      const state = await readJson(descriptor.statePath);
      if (state && ['queued', 'processing'].includes(state.status)) {
        await scheduleFilePreview(file.folder, file.filename, { force: true, userId: file.user_id, waitForCapacity: true }).catch(() => {});
      }
    }
  })().catch(error => console.error('[preview resume]', error.message));
}

function waitForIdle() {
  if (!running && !queue.length) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

function getQueueStatus() {
  return { running, waiting: queue.length, concurrency: 1, capacity: PREVIEW_LIMITS.globalJobs, accountCapacity: PREVIEW_LIMITS.accountJobs };
}

module.exports = {
  resourceRoot,
  cacheDirectoryName,
  classifyFile,
  scheduleFilePreview,
  scheduleMaterialPreviews,
  getPreviewState,
  removeFilePreview,
  cancelMaterialPreviews,
  backfillAllPreviews,
  resumePendingPreviews,
  waitForIdle,
  getQueueStatus,
  PREVIEW_LIMITS
};
