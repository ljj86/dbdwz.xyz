const crypto = require('crypto');
const WINDOW_MS = 15 * 60 * 1000;
const MAX_BUCKETS = 10000;

function accountKey(value) {
  const bounded = typeof value === 'string' && value.length <= 50 ? value : '';
  const normalized = bounded.normalize('NFKC').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function createLoginLimiter({ now = Date.now, accountLimit = 10, sourceLimit = 60, maxConcurrent = 4 } = {}) {
  const accounts = new Map();
  const sources = new Map();
  let concurrent = 0;
  function consume(buckets, key, limit) {
    const time = now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= time) {
      if (buckets.size >= MAX_BUCKETS) {
        for (const [entry, value] of buckets) if (value.until <= time) buckets.delete(entry);
        if (buckets.size >= MAX_BUCKETS && !bucket) return false;
      }
      bucket = { attempts: 0, until: time + WINDOW_MS };
      buckets.set(key, bucket);
    }
    if (bucket.attempts >= limit) return false;
    bucket.attempts += 1;
    return true;
  }
  function reject(res) {
    res.set('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
    return res.status(429).json({ code: 429, message: '登录尝试过于频繁，请稍后重试' });
  }
  return {
    middleware(req, res, next) {
      const source = crypto.createHash('sha256').update(req.ip || req.socket.remoteAddress || 'unknown').digest('hex');
      if (!consume(sources, source, sourceLimit) || !consume(accounts, `name:${accountKey(req.body?.username || '')}`, accountLimit)) return reject(res);
      next();
    },
    allowUser(userId, res) {
      // MySQL's collation may equate more Unicode spellings; use the resolved id
      // as the final account budget before any bcrypt work.
      if (!consume(accounts, `id:${userId}`, accountLimit)) { reject(res); return false; }
      return true;
    },
    acquire(res) {
      if (concurrent >= maxConcurrent) { reject(res); return null; }
      concurrent += 1;
      let released = false;
      return () => { if (!released) { released = true; concurrent -= 1; } };
    }
  };
}

module.exports = { createLoginLimiter, accountKey };
