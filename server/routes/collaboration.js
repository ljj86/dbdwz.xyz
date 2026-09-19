const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');
const archiver = require('archiver');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { getPool } = require('../db');

const router = express.Router();
let categorizedDownloadRunning = false;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
const paperRoot = path.resolve(__dirname, '..', '..', '协作论文');

function safeName(name) {
  return path.basename(String(name || '未命名论文.pdf')).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 200);
}

function safeZipSegment(name, fallback = '未分类') {
  return String(name || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 100) || fallback;
}

function avatarUrl(req, user) {
  return user.avatar ? `${req.protocol}://${req.get('host')}/api/auth/avatar/${user.id}` : '';
}

async function membership(spaceId, userId) {
  const [rows] = await getPool().query(
    'SELECT s.*, m.user_id FROM collaboration_spaces s JOIN collaboration_members m ON m.space_id=s.id WHERE s.id=? AND m.user_id=? LIMIT 1',
    [spaceId, userId]
  );
  return rows[0] || null;
}

async function activePresence(spaceId, userId) {
  const [rows] = await getPool().query(
    'SELECT user_id FROM collaboration_presence WHERE space_id=? AND user_id=? AND last_seen > DATE_SUB(NOW(), INTERVAL 45 SECOND) LIMIT 1',
    [spaceId, userId]
  );
  return !!rows.length;
}

async function requireEditor(spaceId, userId, res) {
  if (await activePresence(spaceId, userId)) return true;
  res.status(403).json({ code: 403, message: '请先点击“+”加入协作后再编辑' });
  return false;
}

router.get('/spaces', authMiddleware, async (req, res) => {
  try {
    let [spaces] = await getPool().query(
      'SELECT s.* FROM collaboration_spaces s JOIN collaboration_members m ON m.space_id=s.id WHERE m.user_id=? ORDER BY s.updated_at DESC',
      [req.user.id]
    );
    if (!spaces.length) {
      [spaces] = await getPool().query('SELECT * FROM collaboration_spaces ORDER BY id LIMIT 1');
      if (!spaces.length) {
        const [result] = await getPool().query(
          'INSERT INTO collaboration_spaces (name, description, owner_id) VALUES (?, ?, ?)',
          ['论文收集', '一起收集、整理和共享论文资料', req.user.id]
        );
        await getPool().query('INSERT INTO collaboration_members (space_id, user_id) VALUES (?, ?)', [result.insertId, req.user.id]);
        const defaults = ['未分类', '待阅读', '重点精读', '方法参考', '已归档'];
        for (let index = 0; index < defaults.length; index += 1) {
          await getPool().query('INSERT INTO collaboration_categories (space_id,name,sort_order) VALUES (?,?,?)', [result.insertId, defaults[index], index]);
        }
        [spaces] = await getPool().query('SELECT * FROM collaboration_spaces WHERE id=?', [result.insertId]);
      }
    }
    res.json({ code: 200, data: { spaces } });
  } catch (error) {
    console.error('[Collaboration] 读取空间失败:', error);
    res.status(500).json({ code: 500, message: '读取协作空间失败' });
  }
});

router.get('/spaces/:id', authMiddleware, async (req, res) => {
  try {
    const [spaces] = await getPool().query('SELECT * FROM collaboration_spaces WHERE id=? LIMIT 1', [Number(req.params.id)]);
    const space = spaces[0];
    if (!space) return res.status(404).json({ code: 404, message: '协作空间不存在' });
    await getPool().query('DELETE FROM collaboration_presence WHERE last_seen <= DATE_SUB(NOW(), INTERVAL 45 SECOND)');
    const [members] = await getPool().query(
      `SELECT u.id,u.username,u.nickname,u.avatar,u.role,p.last_seen
       FROM collaboration_presence p JOIN users u ON u.id=p.user_id
       WHERE p.space_id=? ORDER BY p.last_seen`,
      [space.id]
    );
    const [categories] = await getPool().query(
      'SELECT id,name,sort_order FROM collaboration_categories WHERE space_id=? ORDER BY sort_order,id',
      [space.id]
    );
    const [papers] = await getPool().query(
      `SELECT p.*,u.username,u.nickname,u.avatar
       FROM collaboration_papers p JOIN users u ON u.id=p.uploader_id
       WHERE p.space_id=? ORDER BY p.created_at DESC`,
      [space.id]
    );
    res.json({
      code: 200,
      data: {
        space,
        members: members.map(user => ({ ...user, avatarUrl: avatarUrl(req, user), avatar: undefined })),
        categories,
        canEdit: await activePresence(space.id, req.user.id),
        papers: papers.map(paper => ({
          id: paper.id, title: paper.title, authors: paper.authors, note: paper.note, category: paper.category || '未分类',
          filename: paper.filename, fileSize: Number(paper.file_size), mimeType: paper.mime_type,
          createdAt: paper.created_at,
          uploader: { id: paper.uploader_id, username: paper.username, nickname: paper.nickname, avatarUrl: avatarUrl(req, paper) }
        }))
      }
    });
  } catch (error) {
    console.error('[Collaboration] 读取详情失败:', error);
    res.status(500).json({ code: 500, message: '读取协作内容失败' });
  }
});

router.post('/spaces/:id/presence', authMiddleware, async (req, res) => {
  try {
    const [spaces] = await getPool().query('SELECT id FROM collaboration_spaces WHERE id=? LIMIT 1', [Number(req.params.id)]);
    if (!spaces.length) return res.status(404).json({ code: 404, message: '协作空间不存在' });
    await getPool().query(
      'INSERT INTO collaboration_presence (space_id,user_id,last_seen) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE last_seen=NOW()',
      [Number(req.params.id), req.user.id]
    );
    res.json({ code: 200, message: '已加入当前协作' });
  } catch {
    res.status(500).json({ code: 500, message: '加入协作失败' });
  }
});

router.delete('/spaces/:id/presence', authMiddleware, async (req, res) => {
  try {
    await getPool().query('DELETE FROM collaboration_presence WHERE space_id=? AND user_id=?', [Number(req.params.id), req.user.id]);
    res.json({ code: 200, message: '已退出当前协作' });
  } catch {
    res.status(500).json({ code: 500, message: '退出协作失败' });
  }
});

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const keyword = `%${String(req.query.q || '').trim()}%`;
    const [users] = await getPool().query(
      'SELECT id,username,nickname,avatar FROM users WHERE status=1 AND id<>? AND (username LIKE ? OR nickname LIKE ?) ORDER BY nickname,username LIMIT 20',
      [req.user.id, keyword, keyword]
    );
    res.json({ code: 200, data: { users: users.map(user => ({ ...user, avatarUrl: avatarUrl(req, user), avatar: undefined })) } });
  } catch {
    res.status(500).json({ code: 500, message: '搜索成员失败' });
  }
});

router.post('/spaces/:id/members', authMiddleware, async (req, res) => {
  try {
    const space = await membership(Number(req.params.id), req.user.id);
    if (!space) return res.status(403).json({ code: 403, message: '无权邀请成员' });
    const userId = Number(req.body.userId);
    const [users] = await getPool().query('SELECT id FROM users WHERE id=? AND status=1 LIMIT 1', [userId]);
    if (!users.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    await getPool().query('INSERT IGNORE INTO collaboration_members (space_id,user_id) VALUES (?,?)', [space.id, userId]);
    res.json({ code: 200, message: '已加入协作空间' });
  } catch {
    res.status(500).json({ code: 500, message: '邀请失败' });
  }
});

router.delete('/spaces/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const [spaces] = await getPool().query('SELECT * FROM collaboration_spaces WHERE id=? LIMIT 1', [Number(req.params.id)]);
    const space = spaces[0];
    if (!space || Number(space.owner_id) !== Number(req.user.id)) {
      return res.status(403).json({ code: 403, message: '只有空间创建者可以移除成员' });
    }
    const userId = Number(req.params.userId);
    if (userId === Number(req.user.id)) return res.status(400).json({ code: 400, message: '请直接退出当前协作' });
    const [result] = await getPool().query('DELETE FROM collaboration_presence WHERE space_id=? AND user_id=?', [space.id, userId]);
    if (!result.affectedRows) return res.status(404).json({ code: 404, message: '该成员不在协作空间中' });
    res.json({ code: 200, message: '成员已移除' });
  } catch {
    res.status(500).json({ code: 500, message: '移除成员失败' });
  }
});

router.patch('/papers/:id/category', authMiddleware, async (req, res) => {
  try {
    const category = String(req.body.category || '');
    const [papers] = await getPool().query('SELECT id,space_id FROM collaboration_papers WHERE id=? LIMIT 1', [Number(req.params.id)]);
    if (!papers.length) return res.status(404).json({ code: 404, message: '论文不存在' });
    if (!await requireEditor(papers[0].space_id, req.user.id, res)) return;
    const [categories] = await getPool().query('SELECT name FROM collaboration_categories WHERE space_id=? AND name=? LIMIT 1', [papers[0].space_id, category]);
    if (!categories.length) return res.status(400).json({ code: 400, message: '分类无效' });
    await getPool().query('UPDATE collaboration_papers SET category=? WHERE id=?', [category, papers[0].id]);
    res.json({ code: 200, message: '分类已更新' });
  } catch {
    res.status(500).json({ code: 500, message: '修改分类失败' });
  }
});

router.delete('/papers/:id', authMiddleware, async (req, res) => {
  try {
    const paperId = Number(req.params.id);
    const [papers] = await getPool().query('SELECT id,space_id,stored_name FROM collaboration_papers WHERE id=? LIMIT 1', [paperId]);
    if (!papers.length) return res.status(404).json({ code: 404, message: '论文不存在' });
    const paper = papers[0];
    if (!await requireEditor(paper.space_id, req.user.id, res)) return;
    await getPool().query('DELETE FROM collaboration_papers WHERE id=?', [paper.id]);
    await fs.rm(path.join(paperRoot, path.basename(paper.stored_name)), { force: true }).catch(error => {
      console.warn('[Collaboration] 论文记录已删除，但文件清理失败:', error.message);
    });
    res.json({ code: 200, message: '论文已删除' });
  } catch (error) {
    console.error('[Collaboration] 删除论文失败:', error);
    res.status(500).json({ code: 500, message: '删除论文失败' });
  }
});

router.patch('/spaces/:id/categories/:categoryId', authMiddleware, async (req, res) => {
  try {
    const spaceId = Number(req.params.id);
    if (!await requireEditor(spaceId, req.user.id, res)) return;
    const name = String(req.body.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    const [categories] = await getPool().query('SELECT * FROM collaboration_categories WHERE id=? AND space_id=? LIMIT 1', [Number(req.params.categoryId), spaceId]);
    if (!categories.length) return res.status(404).json({ code: 404, message: '分类不存在' });
    const oldName = categories[0].name;
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE collaboration_categories SET name=? WHERE id=?', [name, categories[0].id]);
      await connection.query('UPDATE collaboration_papers SET category=? WHERE space_id=? AND category=?', [name, spaceId, oldName]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ code: 409, message: '分类名称已存在' });
      throw error;
    } finally {
      connection.release();
    }
    res.json({ code: 200, message: '分类名称已更新' });
  } catch (error) {
    console.error('[Collaboration] 修改分类名失败:', error);
    res.status(500).json({ code: 500, message: '修改分类名失败' });
  }
});

router.post('/spaces/:id/categories', authMiddleware, async (req, res) => {
  try {
    const spaceId = Number(req.params.id);
    if (!await requireEditor(spaceId, req.user.id, res)) return;
    const name = String(req.body.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    const [[count]] = await getPool().query('SELECT COUNT(*) AS total, COALESCE(MAX(sort_order),-1) AS max_order FROM collaboration_categories WHERE space_id=?', [spaceId]);
    if (Number(count.total) >= 20) return res.status(400).json({ code: 400, message: '最多创建 20 个分类' });
    try {
      const [result] = await getPool().query(
        'INSERT INTO collaboration_categories (space_id,name,sort_order) VALUES (?,?,?)',
        [spaceId, name, Number(count.max_order) + 1]
      );
      res.json({ code: 200, message: '分类已创建', data: { id: result.insertId } });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ code: 409, message: '分类名称已存在' });
      throw error;
    }
  } catch (error) {
    console.error('[Collaboration] 新建分类失败:', error);
    res.status(500).json({ code: 500, message: '新建分类失败' });
  }
});

router.delete('/spaces/:id/categories/:categoryId', authMiddleware, async (req, res) => {
  try {
    const spaceId = Number(req.params.id);
    if (!await requireEditor(spaceId, req.user.id, res)) return;
    const [categories] = await getPool().query(
      'SELECT id,name,sort_order FROM collaboration_categories WHERE space_id=? ORDER BY sort_order,id',
      [spaceId]
    );
    if (categories.length <= 1) return res.status(400).json({ code: 400, message: '至少需要保留一个分类' });
    const target = categories.find(item => Number(item.id) === Number(req.params.categoryId));
    if (!target) return res.status(404).json({ code: 404, message: '分类不存在' });
    const fallback = categories.find(item => Number(item.id) !== Number(target.id));
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const [moved] = await connection.query(
        'UPDATE collaboration_papers SET category=? WHERE space_id=? AND category=?',
        [fallback.name, spaceId, target.name]
      );
      await connection.query('DELETE FROM collaboration_categories WHERE id=? AND space_id=?', [target.id, spaceId]);
      await connection.commit();
      res.json({ code: 200, message: '分类已删除', data: { movedCount: moved.affectedRows, movedTo: fallback.name } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Collaboration] 删除分类失败:', error);
    res.status(500).json({ code: 500, message: '删除分类失败' });
  }
});

router.post('/spaces/:id/papers', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const [spaces] = await getPool().query('SELECT * FROM collaboration_spaces WHERE id=? LIMIT 1', [Number(req.params.id)]);
    const space = spaces[0];
    if (!space) return res.status(404).json({ code: 404, message: '协作空间不存在' });
    if (!await requireEditor(space.id, req.user.id, res)) return;
    if (!req.file) return res.status(400).json({ code: 400, message: '请选择论文文件' });
    const filename = safeName(Buffer.from(req.file.originalname, 'latin1').toString('utf8'));
    const title = String(req.body.title || '').trim() || filename.replace(/\.[^.]+$/, '');
    if (title.length > 180) return res.status(400).json({ code: 400, message: '论文标题过长' });
    await fs.mkdir(paperRoot, { recursive: true });
    const storedName = `${Date.now()}-${req.user.id}-${Math.random().toString(36).slice(2, 9)}-${filename}`;
    await fs.writeFile(path.join(paperRoot, storedName), req.file.buffer);
    const [defaultCategories] = await getPool().query(
      'SELECT name FROM collaboration_categories WHERE space_id=? ORDER BY sort_order,id LIMIT 1',
      [space.id]
    );
    const defaultCategory = defaultCategories[0]?.name || '未分类';
    const [result] = await getPool().query(
      'INSERT INTO collaboration_papers (space_id,uploader_id,title,authors,note,category,filename,stored_name,file_size,mime_type) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [space.id, req.user.id, title, String(req.body.authors || '').slice(0, 300), String(req.body.note || '').slice(0, 1000), defaultCategory, filename, storedName, req.file.size, req.file.mimetype || '']
    );
    await getPool().query('UPDATE collaboration_spaces SET updated_at=NOW() WHERE id=?', [space.id]);
    res.json({ code: 200, message: '论文已加入共享列表', data: { id: result.insertId } });
  } catch (error) {
    console.error('[Collaboration] 上传失败:', error);
    res.status(500).json({ code: 500, message: '论文上传失败' });
  }
});

router.get('/papers/:id/file', async (req, res) => {
  try {
    const bearer = String(req.headers.authorization || '').startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : '';
    const user = jwt.verify(bearer || String(req.query.access_token || ''), JWT_SECRET);
    const [rows] = await getPool().query('SELECT * FROM collaboration_papers WHERE id=? LIMIT 1', [Number(req.params.id)]);
    if (!rows.length || !user) return res.sendStatus(403);
    res.download(path.join(paperRoot, path.basename(rows[0].stored_name)), rows[0].filename);
  } catch {
    res.sendStatus(403);
  }
});

router.get('/spaces/:id/download', async (req, res) => {
  if (categorizedDownloadRunning) {
    return res.status(429).json({ code: 429, message: '已有分类压缩包正在生成，请稍后重试' });
  }
  categorizedDownloadRunning = true;
  const releaseDownloadLock = () => { categorizedDownloadRunning = false; };
  res.once('close', releaseDownloadLock);
  res.once('finish', releaseDownloadLock);
  try {
    const bearer = String(req.headers.authorization || '').startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : '';
    const user = jwt.verify(bearer || String(req.query.access_token || ''), JWT_SECRET);
    if (!user) return res.sendStatus(403);
    const spaceId = Number(req.params.id);
    const [spaces] = await getPool().query('SELECT name FROM collaboration_spaces WHERE id=? LIMIT 1', [spaceId]);
    if (!spaces.length) return res.sendStatus(404);
    const [papers] = await getPool().query(
      'SELECT category,filename,stored_name FROM collaboration_papers WHERE space_id=? ORDER BY category,created_at',
      [spaceId]
    );
    const archiveName = `${safeZipSegment(spaces[0].name, '论文收集')}-分类下载.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="papers.zip"; filename*=UTF-8''${encodeURIComponent(archiveName)}`);
    // 论文文件通常已经压缩。store 模式只封装 ZIP 目录，不做二次压缩，
    // 配合流式输出可显著降低双核、小内存服务器的 CPU 与内存压力。
    const archive = archiver('zip', { store: true });
    archive.on('warning', error => console.warn('[Collaboration ZIP]', error.message));
    archive.on('error', error => {
      console.error('[Collaboration ZIP] 打包失败:', error);
      if (!res.headersSent) res.status(500).json({ code: 500, message: '压缩包生成失败' });
      else res.destroy(error);
    });
    archive.pipe(res);
    const usedPaths = new Set();
    for (const paper of papers) {
      const folder = safeZipSegment(paper.category);
      const original = safeZipSegment(paper.filename, '论文文件');
      const extension = path.extname(original);
      const base = path.basename(original, extension);
      let filename = original;
      let index = 2;
      while (usedPaths.has(`${folder}/${filename}`.toLowerCase())) {
        filename = `${base} (${index})${extension}`;
        index += 1;
      }
      usedPaths.add(`${folder}/${filename}`.toLowerCase());
      const source = path.join(paperRoot, path.basename(paper.stored_name));
      archive.file(source, { name: `${folder}/${filename}` });
    }
    await archive.finalize();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.sendStatus(403);
    console.error('[Collaboration ZIP] 下载失败:', error);
    if (!res.headersSent) res.status(500).json({ code: 500, message: '压缩包下载失败' });
  } finally {
    if (res.writableEnded || res.destroyed) releaseDownloadLock();
  }
});

module.exports = router;
