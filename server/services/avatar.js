const sharp = require('sharp');
const crypto = require('crypto');

const MAX_DATA_URL = 8 * 1024 * 1024;
const AVATAR_VERSION = 'av3-webp256';
const MAX_AVATAR_BYTES = 64 * 1024;
const FORMATS = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/webp': 'webp' };

async function reencodeRaster(buffer, mime) {
  const image = sharp(buffer, { failOn: 'error', limitInputPixels: 16 * 1024 * 1024, animated: false }).rotate();
  const metadata = await image.metadata();
  if (metadata.format !== FORMATS[mime] || !metadata.width || !metadata.height) throw new Error('Invalid avatar');
  // Decode and re-encode: only raster pixels reach either the HTTP endpoint or disk.
  for (const [size, quality] of [[256, 75], [192, 70], [128, 65]]) {
    const output = await image.clone().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality, effort: 3 }).toBuffer();
    if (output.length <= MAX_AVATAR_BYTES) return `data:image/webp;base64,${output.toString('base64')}`;
  }
  throw new Error('Avatar output too large');
}

function avatarVersion(value) {
  return `${AVATAR_VERSION}-${value}`;
}

function avatarContentVersion(value) {
  return avatarVersion(crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24));
}

function publicAvatarUrl(req, user) {
  if (!user || !(user.avatar || user.has_avatar)) return '';
  const version = user.avatar_version ? avatarVersion(user.avatar_version) : avatarContentVersion(user.avatar);
  return `${req.protocol}://${req.get('host')}/api/auth/avatar/${user.id}?v=${version}`;
}

function publicUser(req, user) {
  const { avatar, avatar_version, has_avatar, password, passwordHash, ...safeUser } = user;
  return { ...safeUser, avatarUrl: publicAvatarUrl(req, user) };
}

function createAvatarNormalizer({ transform = reencodeRaster, maxConcurrent = 2, maxPending = 8, maxCacheBytes = 8 * 1024 * 1024 } = {}) {
  const cache = new Map();
  const inFlight = new Map();
  const pending = [];
  let running = 0;
  let cacheBytes = 0;
  function schedule(job) {
    if (running >= maxConcurrent) { pending.push(job); return; }
    running += 1;
    job().finally(() => { running -= 1; if (pending.length) schedule(pending.shift()); });
  }
  return async function normalize(value) {
    if (!value) return '';
    if (typeof value !== 'string' || value.length > MAX_DATA_URL) throw new Error('Invalid avatar');
    const match = value.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new Error('Invalid avatar');
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.toString('base64') !== match[2]) throw new Error('Invalid avatar');
    const key = crypto.createHash('sha256').update(AVATAR_VERSION).update(match[1]).update(buffer).digest('hex');
    if (cache.has(key)) {
      const item = cache.get(key);
      cache.delete(key); cache.set(key, item);
      return item.value;
    }
    if (inFlight.has(key)) return inFlight.get(key);
    if (inFlight.size >= maxConcurrent + maxPending) {
      const error = new Error('Avatar conversion busy'); error.code = 'AVATAR_BUSY'; throw error;
    }
    let resolveJob, rejectJob;
    const result = new Promise((resolve, reject) => { resolveJob = resolve; rejectJob = reject; });
    inFlight.set(key, result);
    schedule(async () => {
      try {
        const value = await transform(buffer, match[1]);
        const bytes = Buffer.byteLength(value);
        if (bytes <= maxCacheBytes) {
          while (cacheBytes + bytes > maxCacheBytes && cache.size) {
            const oldest = cache.keys().next().value;
            cacheBytes -= cache.get(oldest).bytes; cache.delete(oldest);
          }
          cache.set(key, { value, bytes }); cacheBytes += bytes;
        }
        resolveJob(value);
      } catch (error) { rejectJob(error); }
      finally { inFlight.delete(key); }
    });
    return result;
  };
}

module.exports = { normalizeAvatar: createAvatarNormalizer(), createAvatarNormalizer, publicAvatarUrl, publicUser, avatarVersion, avatarContentVersion, MAX_AVATAR_BYTES };
