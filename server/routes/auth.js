const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const {
  generateToken,
  generateTutorialTicket,
  generateTutorialSession,
  verifyToken,
  authMiddleware
} = require('../middleware/auth');
const { readProfile, syncUserProfile, writeProfile, publicProfile } = require('../services/profile-storage');

const router = express.Router();

function publicAvatarUrl(req, user) {
  return user && user.avatar
    ? `${req.protocol}://${req.get('host')}/api/auth/avatar/${user.id}?v=${Date.now()}`
    : '';
}

function authCookieOptions(req, maxAge) {
  return { httpOnly: true, secure: req.secure, sameSite: 'lax', maxAge, path: '/' };
}

// GET /api/auth/avatar/:id - 统一头像读取接口
// 可直接用于 image 的 src；查询参数 v 用于头像更新后的缓存刷新。
router.get('/avatar/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).end();

    const [rows] = await getPool().query('SELECT avatar FROM users WHERE id = ? LIMIT 1', [userId]);
    const avatar = rows.length ? String(rows[0].avatar || '') : '';
    const match = avatar.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if (!match) return res.status(404).end();

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) return res.status(404).end();
    res.set('Content-Type', match[1]);
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.send(buffer);
  } catch (err) {
    console.error('读取头像失败:', err.message);
    res.status(500).end();
  }
});

// POST /api/auth/login - 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const [rows] = await getPool().query(
      'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    const user = rows[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    // 更新在线状态
    await getPool().query('UPDATE users SET status = 1 WHERE id = ?', [user.id]);
    await syncUserProfile({ ...user, status: 1 }, { lastLoginAt: new Date().toISOString() });

    // 生成 token
    const token = generateToken(user);
    res.cookie('dbdwz_token', token, authCookieOptions(req, 7 * 24 * 60 * 60 * 1000));

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          avatar: user.avatar,
          avatarUrl: publicAvatarUrl(req, user),
          role: user.role,
          status: 1
        }
      }
    });
  } catch (err) {
    console.error('登录失败:', err.message);
    res.json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/auth/me - 获取当前用户信息 (需登录)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT id, username, nickname, email, avatar, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: { user: { ...rows[0], avatarUrl: publicAvatarUrl(req, rows[0]) } }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err.message);
    res.json({ code: 500, message: '服务器内部错误' });
  }
});

// POST /api/auth/tutorial-ticket - 安卓 WebView 使用的短期教程通行票
router.post('/tutorial-ticket', authMiddleware, (req, res) => {
  res.json({ code: 200, data: { ticket: generateTutorialTicket(req.user) } });
});

// GET /api/auth/tutorial-session - 换取仅可读取教程资源的 HttpOnly 会话
router.get('/tutorial-session', (req, res) => {
  try {
    const decoded = verifyToken(String(req.query.ticket || ''));
    if (decoded.scope !== 'tutorial-ticket') return res.sendStatus(401);
    const nextPath = String(req.query.next || '');
    const allowed = nextPath.startsWith('/static/web/') || nextPath.startsWith('/#/pages/tutorial-detail/');
    if (!allowed) return res.status(400).send('invalid tutorial destination');
    res.cookie('dbdwz_tutorial', generateTutorialSession(decoded), authCookieOptions(req, 4 * 60 * 60 * 1000));
    res.set('Cache-Control', 'no-store');
    res.redirect(302, nextPath);
  } catch (error) {
    res.sendStatus(401);
  }
});

// PUT /api/auth/me - 修改当前用户个人资料
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const nickname = String(req.body.nickname || '').trim();
    const avatar = String(req.body.avatar || '');

    if (!/^[a-zA-Z0-9_]{2,50}$/.test(username)) {
      return res.json({ code: 400, message: '账号 ID 仅支持 2-50 位字母、数字或下划线' });
    }
    if (!nickname || nickname.length > 50) {
      return res.json({ code: 400, message: '名字不能为空且不能超过 50 个字符' });
    }
    if (avatar && (!avatar.startsWith('data:image/') || avatar.length > 8 * 1024 * 1024)) {
      return res.json({ code: 400, message: '头像格式或大小不符合要求' });
    }

    const [duplicate] = await getPool().query(
      'SELECT id FROM users WHERE username = ? AND id <> ?',
      [username, req.user.id]
    );
    if (duplicate.length) return res.json({ code: 409, message: '该账号 ID 已被使用' });

    await getPool().query(
      'UPDATE users SET username = ?, nickname = ?, avatar = ? WHERE id = ?',
      [username, nickname, avatar, req.user.id]
    );
    const [rows] = await getPool().query(
      'SELECT id, username, nickname, email, avatar, role, status FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = rows[0];
    user.avatarUrl = publicAvatarUrl(req, user);
    const [privateRows] = await getPool().query(
      'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    await syncUserProfile(privateRows[0]);
    const token = generateToken(user);
    res.cookie('dbdwz_token', token, authCookieOptions(req, 7 * 24 * 60 * 60 * 1000));
    res.json({ code: 200, message: '个人资料已更新', data: { token, user } });
  } catch (err) {
    console.error('修改个人资料失败:', err.message);
    res.json({ code: 500, message: '个人资料保存失败' });
  }
});

// PUT /api/auth/password - 当前登录用户修改密码
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!currentPassword || !newPassword) return res.status(400).json({ code: 400, message: '请输入当前密码和新密码' });
    if (newPassword.length < 8 || newPassword.length > 72) return res.status(400).json({ code: 400, message: '新密码必须为 8-72 个字符' });
    if (currentPassword === newPassword) return res.status(400).json({ code: 400, message: '新密码不能与当前密码相同' });
    const [rows] = await getPool().query(
      'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    const matched = await bcrypt.compare(currentPassword, rows[0].password);
    if (!matched) return res.status(400).json({ code: 400, message: '当前密码错误' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await getPool().query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    await syncUserProfile({ ...rows[0], password: hashedPassword }, { passwordChangedAt: new Date().toISOString() });
    res.json({ code: 200, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ code: 500, message: '密码修改失败' });
  }
});

// GET /api/auth/profile-storage - 读取当前用户的扩展资料（不返回密码哈希）
router.get('/profile-storage', authMiddleware, async (req, res) => {
  try {
    let profile = await readProfile(req.user.id);
    if (!profile) {
      const [rows] = await getPool().query(
        'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE id = ?',
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
      profile = await syncUserProfile(rows[0]);
    }
    res.json({ code: 200, data: { profile: publicProfile(profile) } });
  } catch (err) {
    console.error('读取个人资料文件失败:', err);
    res.status(500).json({ code: 500, message: '个人资料读取失败' });
  }
});

// PUT /api/auth/profile-storage - 预留邮箱、草稿、偏好与扩展数据接口
router.put('/profile-storage', authMiddleware, async (req, res) => {
  try {
    const serialized = JSON.stringify(req.body || {});
    if (Buffer.byteLength(serialized, 'utf8') > 2 * 1024 * 1024) {
      return res.status(413).json({ code: 413, message: '个人资料扩展数据不能超过 2MB' });
    }
    const [rows] = await getPool().query(
      'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    let profile = await readProfile(req.user.id) || await syncUserProfile(rows[0]);

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const email = String(req.body.email || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
      }
      await getPool().query('UPDATE users SET email = ? WHERE id = ?', [email, req.user.id]);
      profile.account.email = email;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'drafts')) {
      if (!Array.isArray(req.body.drafts) || req.body.drafts.length > 100) {
        return res.status(400).json({ code: 400, message: '草稿必须是数组且最多保存 100 条' });
      }
      profile.drafts = req.body.drafts;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'preferences')) {
      if (!req.body.preferences || typeof req.body.preferences !== 'object' || Array.isArray(req.body.preferences)) {
        return res.status(400).json({ code: 400, message: '偏好设置格式不正确' });
      }
      profile.preferences = req.body.preferences;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'extensions')) {
      if (!req.body.extensions || typeof req.body.extensions !== 'object' || Array.isArray(req.body.extensions)) {
        return res.status(400).json({ code: 400, message: '扩展数据格式不正确' });
      }
      profile.extensions = req.body.extensions;
    }

    profile = await writeProfile(profile);
    res.json({ code: 200, message: '个人扩展资料已保存', data: { profile: publicProfile(profile) } });
  } catch (err) {
    console.error('保存个人资料文件失败:', err);
    res.status(500).json({ code: 500, message: '个人资料保存失败' });
  }
});

// POST /api/auth/logout - 退出登录
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await getPool().query('UPDATE users SET status = 0 WHERE id = ?', [req.user.id]);
    const [rows] = await getPool().query(
      'SELECT id, username, password, nickname, email, avatar, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length) await syncUserProfile(rows[0]);
    res.clearCookie('dbdwz_token', { path: '/' });
    res.clearCookie('dbdwz_tutorial', { path: '/' });
    res.json({ code: 200, message: '已退出登录' });
  } catch (err) {
    res.json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
