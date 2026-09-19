const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { authMiddleware } = require('../middleware/auth');
const { getPool } = require('../db');
const {
  scheduleMaterialPreviews,
  getPreviewState,
  removeFilePreview,
  getQueueStatus
} = require('../services/preview-storage');
const {
  moveToTrash,
  restoreFromTrash,
  rollbackRestore,
  rollbackTrash,
  permanentlyRemove,
  updateTrashMetadata,
  cleanupExpiredTrash
} = require('../services/trash-storage');
const { LIMITS: ARCHIVE_LIMITS, extractZip } = require('../services/archive-extractor');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 500, files: 50 }
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestampName(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function safeFilename(name, fallback) {
  const cleaned = path.basename(String(name || fallback))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
  return cleaned || fallback;
}

async function uniqueDirectory(root, baseName) {
  let index = 0;
  while (true) {
    const name = index ? `${baseName}_${index}` : baseName;
    const target = path.join(root, name);
    try {
      await fs.mkdir(target, { recursive: false });
      return { name, target };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      index += 1;
    }
  }
}

function isTester(user) {
  return !!(user && user.role === 'admin');
}

// 第一阶段：文件只进入系统临时目录，不创建正式资料和数据库记录。
router.post('/stage', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    await cleanupExpiredStaging();
    const uploadTaskId = validTemporaryId(req.body.uploadTaskId);
    const clientFileId = validTemporaryId(req.body.clientFileId);
    const file = req.file;
    if (!uploadTaskId || !clientFileId) return res.status(400).json({ code: 400, message: '临时上传任务无效' });
    if (!file) return res.status(400).json({ code: 400, message: '请选择文件' });
    const originalName = safeFilename(Buffer.from(file.originalname, 'latin1').toString('utf8'), '未命名文件');
    const stage = await readStaging(req.user.id, uploadTaskId);
    const previous = stage.files.find(item => item.clientFileId === clientFileId);
    const replacedFiles = previous
      ? stage.files.filter(item => item.clientFileId === clientFileId || item.parentClientFileId === clientFileId)
      : [];
    await Promise.all(replacedFiles.map(item => fs.rm(path.join(stage.directory, path.basename(item.storedName)), { force: true }).catch(() => {})));
    const storedName = `${clientFileId}-${originalName}`;
    await fs.mkdir(stage.directory, { recursive: true });
    await fs.writeFile(path.join(stage.directory, storedName), file.buffer);
    const files = stage.files.filter(item => item.clientFileId !== clientFileId && item.parentClientFileId !== clientFileId);
    files.push({ clientFileId, originalName, storedName, size: Number(file.size) || 0, mimeType: file.mimetype || '' });
    await writeStaging(stage.directory, uploadTaskId, files);
    res.json({ code: 200, message: '文件已进入临时区', data: { clientFileId, name: originalName, size: Number(file.size) || 0 } });
  } catch (error) {
    console.error('临时上传失败:', error);
    res.status(500).json({ code: 500, message: '临时上传失败' });
  }
});

// ZIP 在线解压：结果只写入当前用户、当前上传任务、当前压缩包对应的临时清单。
router.post('/stage/:uploadTaskId/:clientFileId/extract', authMiddleware, async (req, res) => {
  try {
    const uploadTaskId = validTemporaryId(req.params.uploadTaskId);
    const clientFileId = validTemporaryId(req.params.clientFileId);
    if (!uploadTaskId || !clientFileId) return res.status(400).json({ code: 400, message: '在线解压参数无效' });
    const stage = await readStaging(req.user.id, uploadTaskId);
    const source = stage.files.find(file => file.clientFileId === clientFileId && !file.parentClientFileId);
    if (!source) return res.status(404).json({ code: 404, message: '压缩包临时文件不存在' });
    if (path.extname(source.originalName).toLowerCase() !== '.zip') return res.status(400).json({ code: 400, message: '当前只支持在线解压 ZIP' });
    if (Number(source.size) > ARCHIVE_LIMITS.archiveBytes) return res.status(413).json({ code: 413, message: 'ZIP 不能超过 50MB' });

    const oldChildren = stage.files.filter(file => file.parentClientFileId === clientFileId);
    await Promise.all(oldChildren.map(file => fs.rm(path.join(stage.directory, path.basename(file.storedName)), { force: true }).catch(() => {})));
    const baseFiles = stage.files.filter(file => file.parentClientFileId !== clientFileId);
    const usedNames = new Set(baseFiles.map(file => String(file.originalName || '').toLowerCase()));
    let extracted;
    try {
      extracted = await extractZip({
        archivePath: path.join(stage.directory, path.basename(source.storedName)),
        archiveName: source.originalName,
        targetDirectory: stage.directory,
        parentClientFileId: clientFileId,
        usedNames
      });
    } catch (error) {
      await writeStaging(stage.directory, uploadTaskId, baseFiles);
      throw error;
    }

    const nextFiles = [];
    for (const file of baseFiles) {
      nextFiles.push(file);
      if (file.clientFileId === clientFileId) nextFiles.push(...extracted);
    }
    await writeStaging(stage.directory, uploadTaskId, nextFiles);
    res.json({
      code: 200,
      message: `解压成功，共 ${extracted.length} 个文件`,
      data: {
        parentClientFileId: clientFileId,
        files: extracted.map(file => ({
          clientFileId: file.clientFileId,
          parentClientFileId: file.parentClientFileId,
          name: file.originalName,
          size: file.size,
          archivePath: file.archivePath,
          status: 'uploaded'
        }))
      }
    });
  } catch (error) {
    const status = error.code === 'ARCHIVE_BUSY' ? 429 : 400;
    console.warn('在线解压失败:', error.message);
    res.status(status).json({ code: status, message: error.message || '在线解压失败' });
  }
});

router.get('/stage/:uploadTaskId', authMiddleware, async (req, res) => {
  try {
    const uploadTaskId = validTemporaryId(req.params.uploadTaskId);
    if (!uploadTaskId) return res.status(400).json({ code: 400, message: '临时上传任务无效' });
    const stage = await readStaging(req.user.id, uploadTaskId);
    res.json({ code: 200, data: { uploadTaskId, files: stage.files.map(file => ({ clientFileId: file.clientFileId, parentClientFileId: file.parentClientFileId || '', name: file.originalName, size: Number(file.size) || 0, archivePath: file.archivePath || '', extracted: !!file.extracted })) } });
  } catch (error) {
    res.status(500).json({ code: 500, message: '读取临时上传状态失败' });
  }
});

router.delete('/stage/:uploadTaskId/:clientFileId', authMiddleware, async (req, res) => {
  try {
    const uploadTaskId = validTemporaryId(req.params.uploadTaskId);
    const clientFileId = validTemporaryId(req.params.clientFileId);
    if (!uploadTaskId || !clientFileId) return res.status(400).json({ code: 400, message: '临时文件参数无效' });
    const stage = await readStaging(req.user.id, uploadTaskId);
    const target = stage.files.find(file => file.clientFileId === clientFileId);
    const removed = target && !target.parentClientFileId
      ? stage.files.filter(file => file.clientFileId === clientFileId || file.parentClientFileId === clientFileId)
      : stage.files.filter(file => file.clientFileId === clientFileId);
    await Promise.all(removed.map(file => fs.rm(path.join(stage.directory, path.basename(file.storedName)), { force: true }).catch(() => {})));
    const removedIds = new Set(removed.map(file => file.clientFileId));
    const files = stage.files.filter(file => !removedIds.has(file.clientFileId));
    if (files.length) await writeStaging(stage.directory, uploadTaskId, files);
    else await fs.rm(stage.directory, { recursive: true, force: true });
    res.json({ code: 200, message: '临时文件已删除' });
  } catch (error) {
    res.status(500).json({ code: 500, message: '删除临时文件失败' });
  }
});

router.delete('/stage/:uploadTaskId', authMiddleware, async (req, res) => {
  try {
    const uploadTaskId = validTemporaryId(req.params.uploadTaskId);
    if (!uploadTaskId) return res.status(400).json({ code: 400, message: '临时上传任务无效' });
    await fs.rm(stagingDirectory(req.user.id, uploadTaskId), { recursive: true, force: true });
    res.json({ code: 200, message: '临时上传内容已删除' });
  } catch (error) {
    res.status(500).json({ code: 500, message: '清理临时上传失败' });
  }
});

// 第二阶段：用户明确点击“上传资料”后，才写入正式资源目录和数据库。
router.post('/finalize', authMiddleware, async (req, res) => {
  let createdDirectory = null;
  const uploadTaskId = validTemporaryId(req.body.uploadTaskId);
  const lockKey = `${req.user.id}:${uploadTaskId}`;
  try {
    if (!uploadTaskId) return res.status(400).json({ code: 400, message: '上传任务无效' });
    if (finalizingTasks.has(lockKey)) return res.status(409).json({ code: 409, message: '资料正在保存，请勿重复点击' });
    finalizingTasks.add(lockKey);
    const stage = await readStaging(req.user.id, uploadTaskId);
    if (!stage.files.length) return res.status(400).json({ code: 400, message: '临时文件不存在或已清理，请重新选择' });

    const title = String(req.body.title || '').trim() || stage.files[0].originalName.replace(/\.[^.]+$/, '') || '组会资料';
    const description = String(req.body.description || '').trim();
    if (title.length > 120) return res.status(400).json({ code: 400, message: '标题不能超过 120 个字符' });
    if (description.length > 5000) return res.status(400).json({ code: 400, message: '资料说明不能超过 5000 个字符' });

    const resourceRoot = path.resolve(__dirname, '..', '..', '资源');
    await fs.mkdir(resourceRoot, { recursive: true });
    const folder = await uniqueDirectory(resourceRoot, timestampName());
    createdDirectory = folder.target;
    const usedNames = new Set();
    const savedFiles = [];
    for (let index = 0; index < stage.files.length; index += 1) {
      const file = stage.files[index];
      let filename = safeFilename(file.originalName, `资料_${index + 1}`);
      const parsed = path.parse(filename);
      let duplicateIndex = 1;
      while (usedNames.has(filename.toLowerCase())) {
        filename = `${parsed.name}_${duplicateIndex}${parsed.ext}`;
        duplicateIndex += 1;
      }
      usedNames.add(filename.toLowerCase());
      await fs.copyFile(path.join(stage.directory, path.basename(file.storedName)), path.join(folder.target, filename));
      savedFiles.push({ name: filename, size: Number(file.size) || 0, mimeType: file.mimeType || '' });
    }

    const now = new Date();
    const note = [`资料标题：${title}`, `上传用户：${req.user.username || req.user.id}`, `上传时间：${now.toLocaleString('zh-CN', { hour12: false })}`, '', '资料说明：', description || '无'].join('\r\n');
    await fs.writeFile(path.join(folder.target, '资料说明.txt'), note, 'utf8');
    await fs.writeFile(path.join(folder.target, 'metadata.json'), JSON.stringify({ folder: folder.name, title, description, uploader: { id: req.user.id, username: req.user.username }, uploadedAt: now.toISOString(), updatedAt: now.toISOString(), files: savedFiles.map(file => ({ name: file.name, size: file.size })) }, null, 2), 'utf8');

    const connection = await getPool().getConnection();
    let materialId;
    try {
      await connection.beginTransaction();
      const [materialResult] = await connection.query(
        'INSERT INTO meeting_materials (folder, user_id, title, description, tester_only, uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [folder.name, req.user.id, title, description, isTester(req.user) ? 1 : 0]
      );
      materialId = materialResult.insertId;
      for (const file of savedFiles) {
        await connection.query('INSERT INTO meeting_material_files (material_id, filename, file_size, mime_type) VALUES (?, ?, ?, ?)', [materialId, file.name, file.size, file.mimeType]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    await fs.rm(stage.directory, { recursive: true, force: true });
    const previews = await scheduleMaterialPreviews(folder.name, savedFiles);
    res.json({ code: 200, message: '资料已正式保存，预览正在后台生成', data: { id: materialId, folder: folder.name, files: savedFiles, previews } });
  } catch (error) {
    if (createdDirectory) await fs.rm(createdDirectory, { recursive: true, force: true }).catch(() => {});
    console.error('正式保存资料失败:', error);
    res.status(500).json({ code: 500, message: error.message || '资料保存失败' });
  } finally {
    finalizingTasks.delete(lockKey);
  }
});

router.post('/upload', authMiddleware, upload.array('files', 50), async (req, res) => {
  let createdDirectory = null;
  try {
    const files = req.files || [];
    if (!files.length) return res.json({ code: 400, message: '请选择需要上传的资料文件' });

    const resourceRoot = path.resolve(__dirname, '..', '..', '资源');
    await fs.mkdir(resourceRoot, { recursive: true });
    const folder = await uniqueDirectory(resourceRoot, timestampName());
    createdDirectory = folder.target;

    const usedNames = new Set();
    const savedFiles = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      let filename = safeFilename(Buffer.from(file.originalname, 'latin1').toString('utf8'), `资料_${index + 1}`);
      const parsed = path.parse(filename);
      let duplicateIndex = 1;
      while (usedNames.has(filename.toLowerCase())) {
        filename = `${parsed.name}_${duplicateIndex}${parsed.ext}`;
        duplicateIndex += 1;
      }
      usedNames.add(filename.toLowerCase());
      await fs.writeFile(path.join(folder.target, filename), file.buffer);
      savedFiles.push({ name: filename, size: file.size });
    }

    const note = [
      `资料标题：${req.body.title || ''}`,
      `上传用户：${req.user.username || req.user.id}`,
      `上传时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      '',
      '资料说明：',
      req.body.description || '无'
    ].join('\r\n');
    await fs.writeFile(path.join(folder.target, '资料说明.txt'), note, 'utf8');
    await fs.writeFile(path.join(folder.target, 'metadata.json'), JSON.stringify({
      folder: folder.name,
      title: req.body.title || '',
      description: req.body.description || '',
      uploader: {
        id: req.user.id,
        username: req.user.username
      },
      uploadedAt: new Date().toISOString(),
      files: savedFiles
    }, null, 2), 'utf8');

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const [materialResult] = await connection.query(
        'INSERT INTO meeting_materials (folder, user_id, title, description, tester_only, uploaded_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [folder.name, req.user.id, req.body.title || '未命名资料', req.body.description || '', isTester(req.user) ? 1 : 0]
      );
      for (let index = 0; index < savedFiles.length; index += 1) {
        await connection.query(
          'INSERT INTO meeting_material_files (material_id, filename, file_size, mime_type) VALUES (?, ?, ?, ?)',
          [materialResult.insertId, savedFiles[index].name, savedFiles[index].size, files[index].mimetype || '']
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const previews = await scheduleMaterialPreviews(folder.name, savedFiles);
    res.json({
      code: 200,
      message: '资料上传成功，预览正在后台生成',
      data: { folder: folder.name, files: savedFiles, previews }
    });
  } catch (error) {
    if (createdDirectory) await fs.rm(createdDirectory, { recursive: true, force: true }).catch(() => {});
    console.error('资料上传失败:', error);
    res.json({ code: 500, message: '资料保存失败' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [users] = await getPool().query(
      "SELECT id, username, nickname, CASE WHEN COALESCE(avatar, '') <> '' THEN 1 ELSE 0 END AS has_avatar, UNIX_TIMESTAMP(updated_at) AS avatar_version FROM users WHERE role = 'user' ORDER BY CONVERT(nickname USING gbk), id"
    );
    const [materialRows] = await getPool().query(`
      SELECT m.id, m.folder, m.user_id, m.title, m.description, m.tester_only, m.uploaded_at, m.updated_at,
             u.username, u.nickname,
             CASE WHEN COALESCE(u.avatar, '') <> '' THEN 1 ELSE 0 END AS has_avatar,
             UNIX_TIMESTAMP(u.updated_at) AS avatar_version
      FROM meeting_materials m
      JOIN users u ON u.id = m.user_id
      WHERE m.is_published = 1 AND (m.tester_only = 0 OR ? = 1)
      ORDER BY m.updated_at DESC, m.id DESC
    `, [isTester(req.user) ? 1 : 0]);
    const [fileRows] = await getPool().query(`
      SELECT material_id, filename, file_size, mime_type
      FROM meeting_material_files
      ORDER BY id
    `);
    const filesByMaterial = new Map();
    fileRows.forEach(file => {
      if (!filesByMaterial.has(file.material_id)) filesByMaterial.set(file.material_id, []);
      filesByMaterial.get(file.material_id).push({
        name: file.filename,
        size: Number(file.file_size) || 0,
        mimeType: file.mime_type || ''
      });
    });
    const avatarUrl = (id, hasAvatar, version) => hasAvatar
      ? `${req.protocol}://${req.get('host')}/api/auth/avatar/${id}?v=${version || 0}`
      : '';
    const publicUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: avatarUrl(user.id, user.has_avatar, user.avatar_version)
    }));
    const materials = materialRows.map(material => ({
      id: material.id,
      folder: material.folder,
      title: material.title,
      description: material.description || '',
      testerOnly: !!material.tester_only,
      uploader: {
        id: material.user_id,
        username: material.username,
        nickname: material.nickname,
        avatarUrl: avatarUrl(material.user_id, material.has_avatar, material.avatar_version)
      },
      uploadedAt: material.uploaded_at,
      updatedAt: material.updated_at || material.uploaded_at,
      files: filesByMaterial.get(material.id) || []
    }));
    res.json({ code: 200, data: { users: publicUsers, materials } });
  } catch (error) {
    console.error('读取组会资料失败:', error);
    res.json({ code: 500, message: '读取组会资料失败' });
  }
});

// 当前用户的三天回收站
router.get('/trash', authMiddleware, async (req, res) => {
  try {
    await cleanupExpiredTrash(getPool());
    const [rows] = await getPool().query(`
      SELECT id, folder, user_id, title, description, uploaded_at, deleted_at, delete_expires_at,
             GREATEST(TIMESTAMPDIFF(SECOND, NOW(), delete_expires_at), 0) AS remaining_seconds
      FROM meeting_materials
      WHERE user_id = ? AND is_published = 0 AND delete_expires_at > NOW()
      ORDER BY deleted_at DESC, id DESC
    `, [req.user.id]);

    for (const material of rows) await moveToTrash(material);
    const [fileRows] = await getPool().query(`
      SELECT f.material_id, f.filename, f.file_size, f.mime_type
      FROM meeting_material_files f
      JOIN meeting_materials m ON m.id = f.material_id
      WHERE m.user_id = ? AND m.is_published = 0
      ORDER BY f.id
    `, [req.user.id]);
    const filesByMaterial = new Map();
    fileRows.forEach(file => {
      if (!filesByMaterial.has(file.material_id)) filesByMaterial.set(file.material_id, []);
      filesByMaterial.get(file.material_id).push({ name: file.filename, size: Number(file.file_size) || 0, mimeType: file.mime_type || '' });
    });
    res.json({
      code: 200,
      data: {
        items: rows.map(material => ({
          id: material.id,
          folder: material.folder,
          title: material.title,
          description: material.description || '',
          uploadedAt: material.uploaded_at,
          deletedAt: material.deleted_at,
          expiresAt: material.delete_expires_at,
          remainingSeconds: Number(material.remaining_seconds) || 0,
          files: filesByMaterial.get(material.id) || []
        }))
      }
    });
  } catch (error) {
    console.error('读取我的删除失败:', error);
    res.status(500).json({ code: 500, message: error.message || '读取我的删除失败' });
  }
});

router.put('/trash/:id', authMiddleware, async (req, res) => {
  try {
    const materialId = Number(req.params.id);
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!Number.isInteger(materialId) || materialId <= 0) return res.status(400).json({ code: 400, message: '资料编号无效' });
    if (!title || title.length > 120) return res.status(400).json({ code: 400, message: '标题不能为空且不能超过 120 个字符' });
    if (description.length > 5000) return res.status(400).json({ code: 400, message: '资料说明不能超过 5000 个字符' });
    const [rows] = await getPool().query(
      'SELECT id, folder, user_id FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 0 AND delete_expires_at > NOW() LIMIT 1',
      [materialId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '删除内容不存在或已过期' });
    await getPool().query('UPDATE meeting_materials SET title = ?, description = ? WHERE id = ?', [title, description, materialId]);
    await updateTrashMetadata(rows[0], title, description);
    res.json({ code: 200, message: '删除内容已修改' });
  } catch (error) {
    console.error('修改删除内容失败:', error);
    res.status(500).json({ code: 500, message: '修改失败' });
  }
});

router.post('/trash/:id/restore', authMiddleware, async (req, res) => {
  let material = null;
  let restored = null;
  try {
    const materialId = Number(req.params.id);
    const [rows] = await getPool().query(
      'SELECT id, folder, user_id FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 0 AND delete_expires_at > NOW() LIMIT 1',
      [materialId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '删除内容不存在或已过期' });
    material = rows[0];
    restored = await restoreFromTrash(material);
    await getPool().query(
      'UPDATE meeting_materials SET folder = ?, is_published = 1, deleted_at = NULL, delete_expires_at = NULL WHERE id = ? AND user_id = ?',
      [restored.folder, material.id, req.user.id]
    );
    res.json({ code: 200, message: '资料已重新上架' });
  } catch (error) {
    if (material && restored) await rollbackRestore(material, restored).catch(() => {});
    console.error('重新上架失败:', error);
    res.status(500).json({ code: 500, message: error.message || '重新上架失败' });
  }
});

router.delete('/trash/:id', authMiddleware, async (req, res) => {
  try {
    const materialId = Number(req.params.id);
    const [rows] = await getPool().query(
      'SELECT id, folder, user_id FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 0 LIMIT 1',
      [materialId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '删除内容不存在' });
    await permanentlyRemove(rows[0]);
    await getPool().query('DELETE FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 0', [materialId, req.user.id]);
    res.json({ code: 200, message: '已永久删除' });
  } catch (error) {
    console.error('永久删除失败:', error);
    res.status(500).json({ code: 500, message: '永久删除失败' });
  }
});
const STAGING_ROOT = path.join(os.tmpdir(), 'dbdwz-upload-staging');
const STAGING_TTL_MS = 6 * 60 * 60 * 1000;
const finalizingTasks = new Set();

function validTemporaryId(value) {
  const normalized = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(normalized) ? normalized : '';
}

function stagingDirectory(userId, uploadTaskId) {
  return path.join(STAGING_ROOT, String(Number(userId)), uploadTaskId);
}

async function readStaging(userId, uploadTaskId) {
  const directory = stagingDirectory(userId, uploadTaskId);
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
    return { directory, files: Array.isArray(manifest.files) ? manifest.files : [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { directory, files: [] };
    throw error;
  }
}

async function writeStaging(directory, uploadTaskId, files) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ uploadTaskId, updatedAt: new Date().toISOString(), files }, null, 2), 'utf8');
}

async function cleanupExpiredStaging() {
  await fs.mkdir(STAGING_ROOT, { recursive: true });
  const userDirectories = await fs.readdir(STAGING_ROOT, { withFileTypes: true }).catch(() => []);
  for (const userDirectory of userDirectories) {
    if (!userDirectory.isDirectory()) continue;
    const userPath = path.join(STAGING_ROOT, userDirectory.name);
    const tasks = await fs.readdir(userPath, { withFileTypes: true }).catch(() => []);
    for (const task of tasks) {
      if (!task.isDirectory()) continue;
      const taskPath = path.join(userPath, task.name);
      const stats = await fs.stat(taskPath).catch(() => null);
      if (stats && Date.now() - stats.mtimeMs > STAGING_TTL_MS) await fs.rm(taskPath, { recursive: true, force: true }).catch(() => {});
    }
  }
}

const stagingCleanupTimer = setInterval(() => cleanupExpiredStaging().catch(() => {}), 30 * 60 * 1000);
if (typeof stagingCleanupTimer.unref === 'function') stagingCleanupTimer.unref();

// 读取当前用户自己已发布资料的编辑信息
router.get('/:id/edit', authMiddleware, async (req, res) => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) return res.status(400).json({ code: 400, message: '资料编号无效' });
    const [rows] = await getPool().query(`
      SELECT id, folder, title, description, uploaded_at, updated_at
      FROM meeting_materials
      WHERE id = ? AND user_id = ? AND is_published = 1
      LIMIT 1
    `, [materialId, req.user.id]);
    if (!rows.length) return res.status(403).json({ code: 403, message: '只能修改自己已发布的资料' });
    const [files] = await getPool().query(`
      SELECT id, filename, file_size, mime_type
      FROM meeting_material_files
      WHERE material_id = ?
      ORDER BY id
    `, [materialId]);
    res.json({
      code: 200,
      data: {
        id: rows[0].id,
        folder: rows[0].folder,
        title: rows[0].title,
        description: rows[0].description || '',
        uploadedAt: rows[0].uploaded_at,
        updatedAt: rows[0].updated_at || rows[0].uploaded_at,
        files: files.map(file => ({ id: file.id, name: file.filename, size: Number(file.file_size) || 0, mimeType: file.mime_type || '' }))
      }
    });
  } catch (error) {
    console.error('读取资料编辑信息失败:', error);
    res.status(500).json({ code: 500, message: '读取资料编辑信息失败' });
  }
});

// 修改资料：保留指定旧附件、删除未保留附件，并可追加新附件
router.put('/:id', authMiddleware, upload.array('files', 50), async (req, res) => {
  const writtenPaths = [];
  try {
    const materialId = Number(req.params.id);
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!Number.isInteger(materialId) || materialId <= 0) return res.status(400).json({ code: 400, message: '资料编号无效' });
    if (!title || title.length > 120) return res.status(400).json({ code: 400, message: '标题不能为空且不能超过 120 个字符' });
    if (description.length > 5000) return res.status(400).json({ code: 400, message: '资料说明不能超过 5000 个字符' });

    let keepNames;
    try {
      keepNames = JSON.parse(req.body.keepFiles || '[]');
    } catch {
      return res.status(400).json({ code: 400, message: '保留附件参数无效' });
    }
    if (!Array.isArray(keepNames)) return res.status(400).json({ code: 400, message: '保留附件参数无效' });
    const keepSet = new Set(keepNames.map(name => path.basename(String(name || ''))).filter(Boolean));

    const [materials] = await getPool().query(
      'SELECT id, folder, user_id, uploaded_at FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 1 LIMIT 1',
      [materialId, req.user.id]
    );
    if (!materials.length) return res.status(403).json({ code: 403, message: '只能修改自己已发布的资料' });
    const material = materials[0];
    const [oldFiles] = await getPool().query(
      'SELECT id, filename, file_size, mime_type FROM meeting_material_files WHERE material_id = ? ORDER BY id',
      [materialId]
    );
    const oldNameSet = new Set(oldFiles.map(file => file.filename));
    if ([...keepSet].some(name => !oldNameSet.has(name))) return res.status(400).json({ code: 400, message: '保留附件中包含无效文件' });
    const incomingFiles = req.files || [];
    if (keepSet.size + incomingFiles.length === 0) return res.status(400).json({ code: 400, message: '资料至少需要保留一个附件' });

    const resourceDirectory = path.resolve(__dirname, '..', '..', '资源', material.folder);
    await fs.mkdir(resourceDirectory, { recursive: true });
    const usedNames = new Set(oldFiles.map(file => file.filename.toLowerCase()));
    const addedFiles = [];
    for (let index = 0; index < incomingFiles.length; index += 1) {
      const file = incomingFiles[index];
      let filename = safeFilename(Buffer.from(file.originalname, 'latin1').toString('utf8'), `资料_${index + 1}`);
      const parsed = path.parse(filename);
      let duplicateIndex = 1;
      while (usedNames.has(filename.toLowerCase())) {
        filename = `${parsed.name}_${duplicateIndex}${parsed.ext}`;
        duplicateIndex += 1;
      }
      usedNames.add(filename.toLowerCase());
      const destination = path.join(resourceDirectory, filename);
      await fs.writeFile(destination, file.buffer);
      writtenPaths.push(destination);
      addedFiles.push({ name: filename, size: Number(file.size) || 0, mimeType: file.mimetype || '' });
    }

    const removedFiles = oldFiles.filter(file => !keepSet.has(file.filename));
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'UPDATE meeting_materials SET title = ?, description = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND is_published = 1',
        [title, description, materialId, req.user.id]
      );
      for (const file of removedFiles) await connection.query('DELETE FROM meeting_material_files WHERE id = ? AND material_id = ?', [file.id, materialId]);
      for (const file of addedFiles) {
        await connection.query(
          'INSERT INTO meeting_material_files (material_id, filename, file_size, mime_type) VALUES (?, ?, ?, ?)',
          [materialId, file.name, file.size, file.mimeType]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await Promise.all(removedFiles.map(async (file) => {
      await removeFilePreview(material.folder, file.filename).catch(() => {});
      await fs.rm(path.join(resourceDirectory, file.filename), { force: true }).catch(() => {});
    }));
    const finalFiles = [
      ...oldFiles.filter(file => keepSet.has(file.filename)).map(file => ({ name: file.filename, size: Number(file.file_size) || 0, mimeType: file.mime_type || '' })),
      ...addedFiles
    ];
    const now = new Date();
    const note = [
      `资料标题：${title}`,
      `上传用户：${req.user.username || req.user.id}`,
      `上传时间：${new Date(material.uploaded_at).toLocaleString('zh-CN', { hour12: false })}`,
      `修改时间：${now.toLocaleString('zh-CN', { hour12: false })}`,
      '',
      '资料说明：',
      description || '无'
    ].join('\r\n');
    await fs.writeFile(path.join(resourceDirectory, '资料说明.txt'), note, 'utf8').catch(error => console.warn('更新资料说明失败:', error.message));
    await fs.writeFile(path.join(resourceDirectory, 'metadata.json'), JSON.stringify({
      folder: material.folder,
      title,
      description,
      uploader: { id: req.user.id, username: req.user.username },
      uploadedAt: material.uploaded_at,
      updatedAt: now.toISOString(),
      files: finalFiles.map(file => ({ name: file.name, size: file.size }))
    }, null, 2), 'utf8').catch(error => console.warn('更新资料元数据失败:', error.message));

    const previews = await scheduleMaterialPreviews(material.folder, finalFiles);
    res.json({ code: 200, message: '资料修改成功，新增预览正在后台生成', data: { id: materialId, updatedAt: now.toISOString(), files: finalFiles, previews } });
  } catch (error) {
    await Promise.all(writtenPaths.map(file => fs.rm(file, { force: true }).catch(() => {})));
    console.error('修改组会资料失败:', error);
    res.status(500).json({ code: 500, message: error.message || '资料修改失败' });
  }
});

router.get('/:id/files/:filename/preview', authMiddleware, async (req, res) => {
  try {
    const materialId = Number(req.params.id);
    const filename = path.basename(String(req.params.filename || ''));
    if (!Number.isInteger(materialId) || materialId <= 0 || !filename) {
      return res.status(400).json({ code: 400, message: '预览参数无效' });
    }

    const [rows] = await getPool().query(`
      SELECT m.folder, f.filename, f.file_size
      FROM meeting_materials m
      JOIN meeting_material_files f ON f.material_id = m.id
      WHERE m.id = ? AND m.is_published = 1 AND f.filename = ?
        AND (m.tester_only = 0 OR ? = 1)
      LIMIT 1
    `, [materialId, filename, isTester(req.user) ? 1 : 0]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '文件不存在或资料已下架' });

    const filePath = path.resolve(__dirname, '..', '..', '资源', rows[0].folder, rows[0].filename);
    const state = await getPreviewState(rows[0].folder, rows[0].filename);
    const originalUrl = `/materials-files/${encodeURIComponent(rows[0].folder)}/${encodeURIComponent(rows[0].filename)}`;
    if (['queued', 'processing'].includes(state.status)) {
      return res.json({ code: 202, data: { kind: 'processing', status: state.status, progress: state.progress || 0, queue: getQueueStatus(), message: '预览正在生成，请稍候' } });
    }
    if (state.status === 'missing') {
      return res.status(409).json({ code: 409, data: { kind: 'missing' }, message: '该文件尚未预生成预览，请运行预览补建任务' });
    }
    if (state.status === 'failed') {
      return res.status(422).json({ code: 422, data: { kind: 'failed' }, message: `预览生成失败：${state.error || '未知错误'}` });
    }
    if (state.status === 'unsupported') {
      return res.json({ code: 200, data: { kind: 'unsupported', message: '该格式暂不支持在线预览' } });
    }

    if (state.mode === 'text') {
      if (Number(rows[0].file_size) > 2 * 1024 * 1024) {
        return res.status(413).json({ code: 413, message: '文本文件超过 2MB，请下载后查看' });
      }
      const content = await fs.readFile(filePath, 'utf8');
      return res.json({ code: 200, data: { kind: state.kind, language: state.language || '', content, cached: true } });
    }
    const previewUrl = state.outputFile
      ? `/materials-files/${encodeURIComponent(rows[0].folder)}/_preview/${encodeURIComponent(state.outputFile)}`
      : originalUrl;
    res.json({ code: 200, data: { kind: state.kind, url: previewUrl, cached: true } });
  } catch (error) {
    console.error('读取文件预览失败:', error);
    res.status(500).json({ code: 500, message: '读取文件预览失败' });
  }
});

router.post('/:id/unpublish', authMiddleware, async (req, res) => {
  let material = null;
  let moved = false;
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      return res.status(400).json({ code: 400, message: '资料编号无效' });
    }

    const [rows] = await getPool().query(
      'SELECT id, folder, user_id FROM meeting_materials WHERE id = ? AND user_id = ? AND is_published = 1 LIMIT 1',
      [materialId, req.user.id]
    );
    if (!rows.length) {
      return res.status(403).json({ code: 403, message: '只能下架自己上传的资料，或该资料已下架' });
    }
    material = rows[0];
    await moveToTrash(material);
    moved = true;
    const [result] = await getPool().query(`
      UPDATE meeting_materials
      SET is_published = 0, deleted_at = NOW(), delete_expires_at = DATE_ADD(NOW(), INTERVAL 3 DAY)
      WHERE id = ? AND user_id = ? AND is_published = 1
    `, [materialId, req.user.id]);
    if (!result.affectedRows) throw new Error('资料状态已变化，请刷新后重试');
    res.json({ code: 200, message: '资料已下架，3 天内可在头像菜单的“我的删除”中修改、永久删除或重新上架' });
  } catch (error) {
    if (material && moved) await rollbackTrash(material).catch(() => {});
    console.error('下架组会资料失败:', error);
    res.status(500).json({ code: 500, message: error.message || '资料下架失败' });
  }
});

module.exports = router;
