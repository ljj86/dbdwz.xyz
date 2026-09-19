const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const allowedCategories = new Set(['development', 'ai', 'academic', 'game']);

function isTester(user) {
  return !!(user && user.role === 'admin');
}

function testerOnly(req, res, next) {
  if (!isTester(req.user)) return res.status(403).json({ code: 403, message: '网站推荐仅测试员可管理' });
  next();
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  const parsed = new URL(text);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('只支持 http 或 https 网站链接');
  return parsed.toString();
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await getPool().query(`
      SELECT id, name, description, url, category, icon,
             created_at AS createdAt, updated_at AS updatedAt
      FROM recommended_resources
      WHERE status = 1
      ORDER BY created_at ASC, id ASC
    `);
    res.json({ code: 200, data: { resources: rows } });
  } catch (error) {
    console.error('读取网站推荐失败:', error);
    res.status(500).json({ code: 500, message: '读取网站推荐失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    const icon = String(req.body.icon || '').trim();
    if (!name || name.length > 100) return res.status(400).json({ code: 400, message: '网站名字应为 1—100 个字符' });
    if (!description || description.length > 500) return res.status(400).json({ code: 400, message: '简介应为 1—500 个字符' });
    if (!allowedCategories.has(category)) return res.status(400).json({ code: 400, message: '请选择正确的分类' });
    if (icon.length > 450000) return res.status(413).json({ code: 413, message: '图标过大，请控制在 300KB 以内' });
    let url;
    try { url = normalizeUrl(req.body.url); } catch (error) {
      return res.status(400).json({ code: 400, message: error.message || '网站链接无效' });
    }
    if (url.length > 2000) return res.status(400).json({ code: 400, message: '网站链接过长' });
    const urlHash = crypto.createHash('sha256').update(url.toLowerCase()).digest('hex');
    const [result] = await getPool().query(
      `INSERT INTO recommended_resources (name, description, url, url_hash, category, icon, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, url, urlHash, category, icon, req.user.id]
    );
    res.status(201).json({
      code: 201,
      message: '网站推荐已发布',
      data: { resource: { id: result.insertId, name, description, url, category, icon } }
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') return res.status(409).json({ code: 409, message: '这个网站链接已经推荐过了' });
    console.error('发布网站推荐失败:', error);
    res.status(500).json({ code: 500, message: '发布网站推荐失败' });
  }
});

router.put('/:id', authMiddleware, testerOnly, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const icon = String(req.body.icon || '').trim();
    if (!Number.isInteger(resourceId) || resourceId <= 0) return res.status(400).json({ code: 400, message: '资源编号无效' });
    if (!name || name.length > 100) return res.status(400).json({ code: 400, message: '网站名字应为 1—100 个字符' });
    if (!description || description.length > 500) return res.status(400).json({ code: 400, message: '简介应为 1—500 个字符' });
    if (icon.length > 450000) return res.status(413).json({ code: 413, message: '图标过大，请控制在 300KB 以内' });
    const [result] = await getPool().query(
      'UPDATE recommended_resources SET name = ?, description = ?, icon = ? WHERE id = ? AND status = 1',
      [name, description, icon, resourceId]
    );
    if (!result.affectedRows) return res.status(404).json({ code: 404, message: '网站推荐不存在' });
    res.json({ code: 200, message: '网站推荐已更新', data: { resource: { id: resourceId, name, description, icon } } });
  } catch (error) {
    console.error('更新网站推荐失败:', error);
    res.status(500).json({ code: 500, message: '更新网站推荐失败' });
  }
});

router.delete('/:id', authMiddleware, testerOnly, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    if (!Number.isInteger(resourceId) || resourceId <= 0) return res.status(400).json({ code: 400, message: '资源编号无效' });
    const [result] = await getPool().query(
      'UPDATE recommended_resources SET status = 0 WHERE id = ? AND status = 1',
      [resourceId]
    );
    if (!result.affectedRows) return res.status(404).json({ code: 404, message: '网站推荐不存在' });
    res.json({ code: 200, message: '网站推荐已删除' });
  } catch (error) {
    console.error('删除网站推荐失败:', error);
    res.status(500).json({ code: 500, message: '删除网站推荐失败' });
  }
});

router.put('/:id/icon', authMiddleware, testerOnly, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    const icon = String(req.body.icon || '').trim();
    if (!Number.isInteger(resourceId) || resourceId <= 0) return res.status(400).json({ code: 400, message: '资源编号无效' });
    if (!icon) return res.status(400).json({ code: 400, message: '请选择图标或填写 emoji' });
    if (icon.length > 450000) return res.status(413).json({ code: 413, message: '图标过大，请控制在 300KB 以内' });
    const [result] = await getPool().query(
      'UPDATE recommended_resources SET icon = ? WHERE id = ? AND status = 1',
      [icon, resourceId]
    );
    if (!result.affectedRows) return res.status(404).json({ code: 404, message: '网站推荐不存在' });
    res.json({ code: 200, message: '图标已更新', data: { id: resourceId, icon } });
  } catch (error) {
    console.error('更新网站推荐图标失败:', error);
    res.status(500).json({ code: 500, message: '更新图标失败' });
  }
});

module.exports = router;
