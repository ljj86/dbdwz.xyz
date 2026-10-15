const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = String(process.env.JWT_SECRET || '');
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 必须在 server/.env 中配置，且长度不少于 32 个字符');
}
const JWT_EXPIRES = '7d';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const pool = () => require('../db').getPool();

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

function passwordVersion(password) {
  return crypto.createHmac('sha256', JWT_SECRET).update('password-version\0').update(String(password || '')).digest('hex');
}

async function verifyToken(token) {
  const decoded = jwt.verify(String(token || ''), JWT_SECRET, { algorithms: ['HS256'] });
  if (!Number.isSafeInteger(decoded.id) || !/^[a-f0-9]{64}$/.test(decoded.sid || '') || !/^[a-f0-9]{64}$/.test(decoded.pv || '')) {
    throw new Error('Invalid session');
  }
  const [rows] = await pool().query(
    `SELECT u.id, u.username, u.role, u.password FROM users u
     JOIN auth_sessions s ON s.user_id = u.id
     WHERE s.id = ? AND s.user_id = ? AND s.expires_at > NOW() LIMIT 1`,
    [decoded.sid, decoded.id]
  );
  if (!rows.length || !crypto.timingSafeEqual(Buffer.from(decoded.pv, 'hex'), Buffer.from(passwordVersion(rows[0].password), 'hex'))) {
    throw new Error('Revoked session');
  }
  return { ...decoded, id: rows[0].id, username: rows[0].username, role: rows[0].role };
}

async function generateToken(user, currentSession) {
  const sid = currentSession?.sid || crypto.randomBytes(32).toString('hex');
  const expiresAt = currentSession?.exp || Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  if (!currentSession) {
    await pool().query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    await pool().query('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))', [sid, user.id, expiresAt]);
  }
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, sid, pv: currentSession?.pv || passwordVersion(user.password), exp: expiresAt },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

function scopedToken(user, scope, expiresIn) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, sid: user.sid, pv: user.pv, scope }, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

function generateTutorialTicket(user) { return scopedToken(user, 'tutorial-ticket', '2m'); }
function generateTutorialSession(user) { return scopedToken(user, 'tutorial', '4h'); }

async function revokeSession(user) {
  await pool().query('DELETE FROM auth_sessions WHERE id = ? AND user_id = ?', [user.sid, user.id]);
}

async function revokeUserSessions(userId) {
  await pool().query('DELETE FROM auth_sessions WHERE user_id = ?', [userId]);
}

async function authMiddleware(req, res, next) {
  const token = requestToken(req);
  if (!token) return res.status(401).json({ code: 401, message: '未登录或token已过期' });
  try {
    const decoded = await verifyToken(token);
    if (decoded.scope) return res.status(401).json({ code: 401, message: '登录凭证类型无效' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'token无效或已过期' });
  }
}

async function tutorialStaticMiddleware(req, res, next) {
  const tokens = [readCookie(req, 'dbdwz_token'), readCookie(req, 'dbdwz_tutorial')].filter(Boolean);
  for (const token of tokens) {
    try {
      const decoded = await verifyToken(token);
      if (decoded.scope && decoded.scope !== 'tutorial') continue;
      req.user = decoded;
      return next();
    } catch (error) { /* Try the other scoped cookie, if present. */ }
  }
  return res.sendStatus(401);
}

async function optionalAuth(req, res, next) {
  const token = requestToken(req);
  if (token) {
    try {
      const decoded = await verifyToken(token);
      if (!decoded.scope) req.user = decoded;
    } catch (error) { /* Public requests remain public. */ }
  }
  next();
}

module.exports = { JWT_SECRET, JWT_EXPIRES, generateToken, generateTutorialTicket, generateTutorialSession, verifyToken,
  revokeSession, revokeUserSessions, authMiddleware, tutorialStaticMiddleware, optionalAuth };
