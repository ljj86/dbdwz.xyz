const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const {
  generateToken,
  generateTutorialTicket,
  generateTutorialSession,
  verifyToken,
  revokeSession,
  revokeUserSessions,
  authMiddleware
} = require('../middleware/auth');
const { readProfile, syncUserProfileFromDatabase, updateUserProfile, publicProfile } = require('../services/profile-storage');
const { normalizeAvatar, publicAvatarUrl, publicUser, avatarContentVersion } = require('../services/avatar');
const { createLoginLimiter } = require('../middleware/login-limiter');
const { createLoginProfileSync } = require('../services/login-profile-sync');
const { validLoginPassword, validNewPassword } = require('../services/password-policy');
const { createAvatarDelivery } = require('../middleware/avatar-delivery');

const router = express.Router();
const loginLimiter = createLoginLimiter();
const loginProfiles = createLoginProfileSync({ getPool });
const deliverAvatar = createAvatarDelivery();

function authCookieOptions(req, maxAge) {
  return { httpOnly: true, secure: req.secure, sameSite: 'lax', maxAge, path: '/' };
}

// GET /api/auth/avatar/:id - 统一头像读取接口
// 可直接用于 image 的 src；查询参数 v 用于头像更新后的缓存刷新。
router.get('/avatar/:id', deliverAvatar(async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).end();

    const [rows] = await getPool().query('SELECT avatar FROM users WHERE id = ? LIMIT 1', [userId]);
    if (req.aborted || res.destroyed) return;
    const avatar = rows.length ? String(rows[0].avatar || '') : '';
    const safeAvatar = await normalizeAvatar(avatar).catch(error => {
      if (error.code === 'AVATAR_BUSY') throw error;
      return '';
    });
    if (req.aborted || res.destroyed) return;
    const match = safeAvatar.match(/^data:(image\/webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(404).end();

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) return res.status(404).end();
    res.set('Content-Type', match[1]);
    res.set('X-Content-Type-Options', 'nosniff');
    const version = avatarContentVersion(avatar);
    res.set('Cache-Control', req.query.v === version ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    const etag = `"${version}"`;
    res.set('ETag', etag);
    const matches = String(req.get('if-none-match') || '').split(',').map(value => value.trim().replace(/^W\//, ''));
    if (matches.includes(etag) || matches.includes('*')) return res.status(304).end();
    res.send(buffer);
  } catch (err) {
    if (req.aborted || res.destroyed) return;
    if (err.code === 'AVATAR_BUSY') return res.set('Retry-After', '1').status(429).end();
    console.error('读取头像失败:', err.message);
    res.status(500).end();
  }
}));

// POST /api/auth/login - 登录
router.post('/login', loginLimiter.middleware, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || !username || username.length > 50 || !validLoginPassword(password)) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const [rows] = await getPool().query(
      `SELECT id, username, password, nickname, email, role, status, created_at,
       CASE WHEN COALESCE(avatar, '') <> '' THEN 1 ELSE 0 END AS has_avatar,
       SUBSTRING(SHA2(COALESCE(avatar, ''), 256), 1, 24) AS avatar_version FROM users WHERE username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    const user = rows[0];
    if (!loginLimiter.allowUser(user.id, res)) return;

    // 验证密码
    const release = loginLimiter.acquire(res);
    if (!release) return;
    let isMatch;
    try { isMatch = await bcrypt.compare(password, user.password); } finally { release(); }
    if (!isMatch) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    // 更新在线状态
    await getPool().query('UPDATE users SET status = 1 WHERE id = ?', [user.id]);

    // 生成 token
    const token = await generateToken(user);
    res.cookie('dbdwz_token', token, authCookieOptions(req, 7 * 24 * 60 * 60 * 1000));
    loginProfiles.enqueue(user.id);

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
          avatarUrl: publicAvatarUrl(req, user),
          role: user.role,
          status: 1
        }
      }
    });
  } catch (err) {
    console.error('登录失败:', err.code || err.name || 'Error');
    res.json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/auth/me - 获取当前用户信息 (需登录)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT id, username, nickname, email, role, status, created_at,
       CASE WHEN COALESCE(avatar, '') <> '' THEN 1 ELSE 0 END AS has_avatar,
       SUBSTRING(SHA2(COALESCE(avatar, ''), 256), 1, 24) AS avatar_version FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: { user: publicUser(req, rows[0]) }
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
router.get('/tutorial-session', async (req, res) => {
  try {
    const decoded = await verifyToken(String(req.query.ticket || ''));
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
    const avatarChanged = Object.prototype.hasOwnProperty.call(req.body, 'avatar');
    let avatar;
    if (avatarChanged) {
      try {
        if (typeof req.body.avatar !== 'string') throw new Error('Invalid avatar');
        avatar = await normalizeAvatar(req.body.avatar);
      } catch (error) {
        if (error.code === 'AVATAR_BUSY') return res.set('Retry-After', '1').status(429).json({ code: 429, message: '头像正在处理，请稍后重试' });
        return res.json({ code: 400, message: '头像仅支持有效的 PNG、JPEG、GIF 或 WebP 图片，且不能超过 8MB' });
      }
    }

    if (!/^[a-zA-Z0-9_]{2,50}$/.test(username)) {
      return res.json({ code: 400, message: '账号 ID 仅支持 2-50 位字母、数字或下划线' });
    }
    if (!nickname || nickname.length > 50) {
      return res.json({ code: 400, message: '名字不能为空且不能超过 50 个字符' });
    }
    const [duplicate] = await getPool().query(
      'SELECT id FROM users WHERE username = ? AND id <> ?',
      [username, req.user.id]
    );
    if (duplicate.length) return res.json({ code: 409, message: '该账号 ID 已被使用' });

    if (avatarChanged) {
      await getPool().query('UPDATE users SET username = ?, nickname = ?, avatar = ? WHERE id = ?', [username, nickname, avatar, req.user.id]);
    } else {
      await getPool().query('UPDATE users SET username = ?, nickname = ? WHERE id = ?', [username, nickname, req.user.id]);
    }
    const [rows] = await getPool().query(
      `SELECT id, username, nickname, email, role, status,
       CASE WHEN COALESCE(avatar, '') <> '' THEN 1 ELSE 0 END AS has_avatar,
       SUBSTRING(SHA2(COALESCE(avatar, ''), 256), 1, 24) AS avatar_version FROM users WHERE id = ?`,
      [req.user.id]
    );
    const user = publicUser(req, rows[0]);
    await syncUserProfileFromDatabase(getPool(), req.user.id);
    const token = await generateToken(user, req.user);
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
    const { currentPassword, newPassword } = req.body;
    if (!validLoginPassword(currentPassword) || typeof newPassword !== 'string' || !newPassword) return res.status(400).json({ code: 400, message: '请输入有效的当前密码和新密码' });
    if (!validNewPassword(newPassword)) return res.status(400).json({ code: 400, message: '新密码至少 8 个字符，UTF-8 编码不能超过 72 字节（中文通常最多 24 字）' });
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
    await revokeUserSessions(req.user.id);
    await syncUserProfileFromDatabase(getPool(), req.user.id, { passwordChangedAt: new Date().toISOString() });
    res.clearCookie('dbdwz_token', { path: '/' });
    res.clearCookie('dbdwz_tutorial', { path: '/' });
    res.json({ code: 200, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error.code || error.name || 'Error');
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
      profile = await syncUserProfileFromDatabase(getPool(), req.user.id);
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
    let email;
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      email = String(req.body.email || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'drafts')) {
      if (!Array.isArray(req.body.drafts) || req.body.drafts.length > 100) {
        return res.status(400).json({ code: 400, message: '草稿必须是数组且最多保存 100 条' });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'preferences')) {
      if (!req.body.preferences || typeof req.body.preferences !== 'object' || Array.isArray(req.body.preferences)) {
        return res.status(400).json({ code: 400, message: '偏好设置格式不正确' });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'extensions')) {
      if (!req.body.extensions || typeof req.body.extensions !== 'object' || Array.isArray(req.body.extensions)) {
        return res.status(400).json({ code: 400, message: '扩展数据格式不正确' });
      }
    }

    const profile = await updateUserProfile(getPool(), req.user.id, async profile => {
      if (email !== undefined) {
        await getPool().query('UPDATE users SET email = ? WHERE id = ?', [email, req.user.id]);
        profile.account.email = email;
      }
      for (const field of ['drafts', 'preferences', 'extensions']) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) profile[field] = req.body[field];
      }
    });
    if (!profile) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 200, message: '个人扩展资料已保存', data: { profile: publicProfile(profile) } });
  } catch (err) {
    console.error('保存个人资料文件失败:', err);
    res.status(500).json({ code: 500, message: '个人资料保存失败' });
  }
});

// POST /api/auth/logout - 退出登录
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await revokeSession(req.user);
    await getPool().query('UPDATE users SET status = 0 WHERE id = ?', [req.user.id]);
    await syncUserProfileFromDatabase(getPool(), req.user.id);
    res.clearCookie('dbdwz_token', { path: '/' });
    res.clearCookie('dbdwz_tutorial', { path: '/' });
    res.json({ code: 200, message: '已退出登录' });
  } catch (err) {
    res.json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
