const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const resourceRoot = path.resolve(process.env.RESOURCE_ROOT || path.join(__dirname, '..', '..', '资源'));
const cacheDirectoryName = '_preview';
const queue = [];
const queuedKeys = new Set();
const idleWaiters = [];
let running = false;

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
    signature: `${stat.size}:${Math.round(stat.mtimeMs)}`,
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

async function convertOffice(descriptor, outputFile) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dbdwz-office-'));
  const outputDirectory = path.join(temporaryRoot, 'out');
  const profileDirectory = path.join(temporaryRoot, 'profile');
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.mkdir(profileDirectory, { recursive: true });
    const binary = libreOfficeBinary();
    if (binary) {
      await execFileAsync(binary, [
        `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
        '--headless', '--nologo', '--nodefault', '--norestore',
        '--convert-to', 'pdf', '--outdir', outputDirectory, descriptor.sourcePath
      ], {
        timeout: Number(process.env.OFFICE_PREVIEW_TIMEOUT_MS || 240000),
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
      });
    } else if (process.platform === 'win32') {
      const generated = path.join(outputDirectory, `${path.parse(descriptor.name).name}.pdf`);
      const helper = path.join(__dirname, '..', 'scripts', 'convert-office-windows.ps1');
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', helper, descriptor.sourcePath, generated
      ], {
        timeout: Number(process.env.OFFICE_PREVIEW_TIMEOUT_MS || 240000),
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
    if (!stat.size) throw new Error('LibreOffice 生成了空 PDF');
    await fs.mkdir(descriptor.cachePath, { recursive: true });
    await fs.rm(path.join(descriptor.cachePath, outputFile), { force: true });
    await fs.copyFile(generated, path.join(descriptor.cachePath, outputFile));
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function convertVideo(descriptor, outputFile) {
  await fs.mkdir(descriptor.cachePath, { recursive: true });
  const target = path.join(descriptor.cachePath, outputFile);
  const temporary = `${target}.${process.pid}.tmp.mp4`;
  const binary = process.env.FFMPEG_BIN || 'ffmpeg';
  try {
    await execFileAsync(binary, [
      '-y', '-i', descriptor.sourcePath,
      '-map', '0:v:0?', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p', '-threads', '1',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', temporary
    ], {
      timeout: Number(process.env.VIDEO_PREVIEW_TIMEOUT_MS || 1800000),
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    });
    const stat = await fs.stat(temporary);
    if (!stat.size) throw new Error('FFmpeg 生成了空视频');
    await fs.rm(target, { force: true });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function processTask(task) {
  let descriptor;
  try {
    descriptor = await sourceDescriptor(task.folder, task.filename);
    const outputFile = `${descriptor.key}${descriptor.classification.outputExtension || ''}`;
    // 转换工具没有可靠的逐文件百分比回调，不伪造中间进度；只报告处理中和完成。
    await writeState(descriptor, { status: 'processing', progress: 0, outputFile });
    if (descriptor.classification.mode === 'libreoffice') await convertOffice(descriptor, outputFile);
    else if (descriptor.classification.mode === 'ffmpeg') await convertVideo(descriptor, outputFile);
    await writeState(descriptor, { status: 'ready', progress: 100, outputFile, error: '' });
  } catch (error) {
    if (descriptor && descriptor.classification.mode === 'libreoffice' && error && error.code === 'ENOENT') {
      error.message = '未找到 Office 转换程序。Linux 请安装 LibreOffice；Windows 请安装 LibreOffice 或 WPS，并可通过 LIBREOFFICE_BIN 指定完整路径';
    }
    if (descriptor) {
      await writeState(descriptor, {
        status: 'failed', progress: 0,
        error: String(error && error.message ? error.message : error).slice(0, 1000)
      }).catch(() => {});
    }
    console.error(`[preview] ${task.folder}/${task.filename}:`, error.message || error);
  }
}

async function drainQueue() {
  if (running) return;
  running = true;
  while (queue.length) {
    const task = queue.shift();
    try {
      await processTask(task);
    } finally {
      queuedKeys.delete(task.queueKey);
    }
  }
  running = false;
  notifyIdle();
}

function enqueue(folder, filename) {
  const queueKey = `${folder}\u0000${filename}`;
  if (queuedKeys.has(queueKey)) return;
  queuedKeys.add(queueKey);
  queue.push({ folder, filename, queueKey });
  setImmediate(() => drainQueue().catch((error) => console.error('[preview queue]', error)));
}

async function scheduleFilePreview(folderName, filename, options = {}) {
  const descriptor = await sourceDescriptor(folderName, filename);
  const existing = await readJson(descriptor.statePath);
  if (!options.force && existing && existing.signature === descriptor.signature && existing.status === 'ready' && await outputExists(descriptor, existing)) {
    return existing;
  }
  if (['direct', 'text', 'unsupported'].includes(descriptor.classification.mode)) {
    return writeState(descriptor, {
      status: descriptor.classification.mode === 'unsupported' ? 'unsupported' : 'ready',
      progress: 100,
      outputFile: '',
      error: ''
    });
  }
  const outputFile = `${descriptor.key}${descriptor.classification.outputExtension}`;
  const state = await writeState(descriptor, { status: 'queued', progress: 0, outputFile, error: '' });
  enqueue(descriptor.folder, descriptor.name);
  return state;
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
  const paths = folderPaths(folderName, filename);
  const state = await readJson(paths.statePath);
  if (state && state.outputFile) await fs.rm(path.join(paths.cachePath, path.basename(state.outputFile)), { force: true });
  await fs.rm(paths.statePath, { force: true });
}

async function backfillAllPreviews(options = {}) {
  let folders = [];
  try {
    folders = await fs.readdir(resourceRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
  let count = 0;
  for (const folderEntry of folders) {
    if (!folderEntry.isDirectory() || folderEntry.name.startsWith('.')) continue;
    const folderPath = path.join(resourceRoot, folderEntry.name);
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && !['metadata.json', '资料说明.txt'].includes(entry.name))
      .map((entry) => entry.name);
    count += files.length;
    await scheduleMaterialPreviews(folderEntry.name, files, options);
  }
  return count;
}

async function resumePendingPreviews() {
  let folders = [];
  try { folders = await fs.readdir(resourceRoot, { withFileTypes: true }); } catch { return; }
  for (const folderEntry of folders) {
    if (!folderEntry.isDirectory()) continue;
    const cachePath = path.join(resourceRoot, folderEntry.name, cacheDirectoryName);
    let states = [];
    try { states = await fs.readdir(cachePath); } catch { continue; }
    for (const stateFile of states.filter((name) => name.endsWith('.json'))) {
      const state = await readJson(path.join(cachePath, stateFile));
      if (state && ['queued', 'processing'].includes(state.status)) {
        scheduleFilePreview(folderEntry.name, state.filename, { force: true }).catch(() => {});
      }
    }
  }
}

function waitForIdle() {
  if (!running && !queue.length) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

function getQueueStatus() {
  return { running, waiting: queue.length, concurrency: 1 };
}

module.exports = {
  resourceRoot,
  cacheDirectoryName,
  classifyFile,
  scheduleFilePreview,
  scheduleMaterialPreviews,
  getPreviewState,
  removeFilePreview,
  backfillAllPreviews,
  resumePendingPreviews,
  waitForIdle,
  getQueueStatus
};
