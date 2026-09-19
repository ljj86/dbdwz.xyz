const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = String(process.env.JWT_SECRET || '');
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 必须在 server/.env 中配置，且长度不少于 32 个字符');
}
const JWT_EXPIRES = '7d';

function readCookie(req, name) {
  const prefix = `${name}=`;
  const item = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  if (!item) return '';
  try { return decodeURIComponent(item.slice(prefix.length)); } catch (error) { return ''; }
}

function requestToken(req, cookieName = 'dbdwz_token') {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return readCookie(req, cookieName);
}

function verifyToken(token) {
  return jwt.verify(String(token || ''), JWT_SECRET);
}

// 生成 token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function generateTutorialTicket(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, scope: 'tutorial-ticket' },
    JWT_SECRET,
    { expiresIn: '2m' }
  );
}

function generateTutorialSession(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, scope: 'tutorial' },
    JWT_SECRET,
    { expiresIn: '4h' }
  );
}

// 验证 token 中间件
function authMiddleware(req, res, next) {
  const token = requestToken(req);
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录或token已过期' });
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.scope) return res.status(401).json({ code: 401, message: '登录凭证类型无效' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'token无效或已过期' });
  }
}

function tutorialStaticMiddleware(req, res, next) {
  const token = readCookie(req, 'dbdwz_token') || readCookie(req, 'dbdwz_tutorial');
  if (!token) return res.sendStatus(401);
  try {
    const decoded = verifyToken(token);
    if (decoded.scope && decoded.scope !== 'tutorial') return res.sendStatus(401);
    req.user = decoded;
    next();
  } catch (error) {
    return res.sendStatus(401);
  }
}

// 可选认证（不强制要求登录）
function optionalAuth(req, res, next) {
  const token = requestToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (!decoded.scope) req.user = decoded;
    } catch (e) {
      // token无效忽略，继续
    }
  }
  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES,
  generateToken,
  generateTutorialTicket,
  generateTutorialSession,
  verifyToken,
  authMiddleware,
  tutorialStaticMiddleware,
  optionalAuth
};
