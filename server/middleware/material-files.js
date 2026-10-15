const fs = require('fs/promises');
const path = require('path');
const { getPool } = require('../db');
const { resourceRoot } = require('../services/upload-storage');
const { getPreviewState } = require('../services/preview-storage');

function parseFilePath(url) {
  const raw = String(url || '').split('?')[0];
  let segments;
  try { segments = raw.split('/').slice(1).map(value => decodeURIComponent(value)); }
  catch { return null; }
  if (![2, 3].includes(segments.length)) return null;
  if (segments.some(value => !value || value === '.' || value === '..' || /[\/\\\x00-\x1F]/.test(value))) return null;
  if (segments.length === 3 && segments[1] !== '_preview') return null;
  return segments;
}

async function materialFiles(req, res) {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(405);
    const segments = parseFilePath(req.url);
    if (!segments) return res.sendStatus(404);
    const [folder] = segments;
    const [rows] = await getPool().query(`
      SELECT m.id, m.folder, m.tester_only, f.filename
      FROM meeting_materials m
      JOIN meeting_material_files f ON f.material_id = m.id
      WHERE m.folder = ? AND m.is_published = 1
      ORDER BY f.id
    `, [folder]);
    if (!rows.length || rows[0].folder !== folder) return res.sendStatus(404);
    if (rows[0].tester_only && req.user.role !== 'admin') return res.sendStatus(403);
    let filename;
    if (segments.length === 2) {
      const file = rows.find(row => row.filename === segments[1]);
      if (!file) return res.sendStatus(404);
      filename = file.filename;
    } else {
      const output = segments[2];
      if (!/^[a-f0-9]{32}\.(pdf|mp4)$/.test(output)) return res.sendStatus(404);
      for (const row of rows) {
        const state = await getPreviewState(folder, row.filename).catch(() => null);
        if (state && state.status === 'ready' && state.outputFile === output && ['libreoffice', 'ffmpeg'].includes(state.mode)) {
          filename = path.join('_preview', output);
          break;
        }
      }
      if (!filename) return res.sendStatus(404);
    }
    const canonicalRoot = await fs.realpath(resourceRoot);
    const canonicalFolder = await fs.realpath(path.join(resourceRoot, folder));
    if (canonicalFolder !== path.join(canonicalRoot, folder)) return res.sendStatus(404);
    const target = await fs.realpath(path.join(canonicalFolder, filename));
    if (!target.startsWith(canonicalFolder + path.sep)) return res.sendStatus(404);
    const stat = await fs.stat(target);
    if (!stat.isFile()) return res.sendStatus(404);
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'"
    });
    if (!/\.(?:pdf|png|jpe?g|gif|webp|bmp|ico|avif|mp4|webm|ogv|m4v|mp3|wav|flac|m4a|aac|ogg|oga|opus|txt|log|csv|tsv)$/i.test(filename)) {
      res.attachment(path.basename(filename));
      res.type('application/octet-stream');
    }
    res.sendFile(target, { cacheControl: false, dotfiles: 'allow' }, error => {
      if (error && !res.headersSent) res.sendStatus(error.status || 404);
    });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return res.sendStatus(404);
    console.error('[Materials files] 文件读取失败:', error.message);
    if (!res.headersSent) res.sendStatus(500);
  }
}
module.exports = { materialFiles, parseFilePath };
