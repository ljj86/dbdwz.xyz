const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { version: projectVersion } = require('../../package.json');

const router = express.Router();
const releaseDirectory = path.resolve(
  process.env.ANDROID_RELEASE_DIR || path.join(__dirname, '..', '..', '安卓发布')
);
const manifestPath = path.join(releaseDirectory, 'release.json');

function versionCode(versionName) {
  const parts = String(versionName || '').split('.').map(value => Number(value) || 0);
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

function normalizeManifest(raw = {}) {
  const apkFilename = String(raw.apkFilename || '').trim();
  if (apkFilename && path.basename(apkFilename) !== apkFilename) throw new Error('release.json 中的 apkFilename 只能填写文件名');
  const releaseNotes = Array.isArray(raw.releaseNotes)
    ? raw.releaseNotes.map(item => String(item).trim()).filter(Boolean).slice(0, 12)
    : String(raw.releaseNotes || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0, 12);
  const name = String(raw.versionName || projectVersion);
  return {
    platform: 'android',
    versionName: name,
    versionCode: Math.max(0, Number(raw.versionCode) || versionCode(name)),
    title: String(raw.title || `dbdwz.xyz v${name}`),
    releaseNotes,
    mandatory: raw.mandatory === true,
    publishedAt: String(raw.publishedAt || ''),
    apkFilename,
    sha256: /^[a-f0-9]{64}$/i.test(String(raw.sha256 || '')) ? String(raw.sha256).toLowerCase() : ''
  };
}

async function readRelease() {
  let configured = true;
  let raw = {};
  try {
    raw = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    configured = false;
  }
  const release = normalizeManifest(raw);
  let hasPackage = false;
  let fileSize = 0;
  if (release.apkFilename) {
    try {
      const stats = await fs.stat(path.join(releaseDirectory, release.apkFilename));
      hasPackage = stats.isFile();
      fileSize = hasPackage ? stats.size : 0;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return { ...release, configured, hasPackage, fileSize, downloadUrl: hasPackage ? '/api/app-updates/download' : '' };
}

router.get('/latest', authMiddleware, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ code: 200, data: { release: await readRelease() } });
  } catch (error) {
    console.error('读取安卓更新信息失败:', error.message);
    res.status(500).json({ code: 500, message: '暂时无法读取安卓更新信息' });
  }
});

router.get('/download', authMiddleware, async (req, res) => {
  try {
    const release = await readRelease();
    if (!release.hasPackage) return res.status(404).json({ code: 404, message: '安卓安装包尚未发布' });
    const target = path.join(releaseDirectory, release.apkFilename);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${release.apkFilename.replace(/["\\]/g, '_')}"`);
    res.sendFile(target);
  } catch (error) {
    console.error('下载安卓更新包失败:', error.message);
    if (!res.headersSent) res.status(500).json({ code: 500, message: '安卓安装包下载失败' });
  }
});

module.exports = router;
