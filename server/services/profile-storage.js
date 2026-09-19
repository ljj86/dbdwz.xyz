const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PROFILE_ROOT = path.resolve(__dirname, '..', '..', '个人资料');
const PROFILE_SCHEMA_VERSION = 2;

function userProfileDirectory(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('用户编号无效');
  return path.join(PROFILE_ROOT, `user-${id}`);
}

function profilePath(userId) {
  return path.join(userProfileDirectory(userId), 'profile.json');
}

function legacyProfilePath(userId) {
  return path.join(PROFILE_ROOT, `user-${Number(userId)}.json`);
}

function deletedDirectory(userId) {
  return path.join(userProfileDirectory(userId), 'deleted');
}

async function ensureUserDirectories(userId) {
  const root = userProfileDirectory(userId);
  await Promise.all([
    fs.mkdir(root, { recursive: true }),
    fs.mkdir(path.join(root, 'avatar'), { recursive: true }),
    fs.mkdir(deletedDirectory(userId), { recursive: true })
  ]);
  return root;
}

async function syncAvatarAsset(userId, avatar) {
  const avatarDirectory = path.join(userProfileDirectory(userId), 'avatar');
  await fs.mkdir(avatarDirectory, { recursive: true });
  const match = String(avatar || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) {
    const files = await fs.readdir(avatarDirectory).catch(() => []);
    await Promise.all(files.map(file => fs.rm(path.join(avatarDirectory, file), { force: true })));
    return '';
  }

  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
  const buffer = Buffer.from(match[2], 'base64');
  const extension = extensions[match[1].toLowerCase()] || 'img';
  const filename = `avatar-${crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12)}.${extension}`;
  const target = path.join(avatarDirectory, filename);
  try {
    await fs.access(target);
  } catch {
    await fs.writeFile(target, buffer);
  }
  const files = await fs.readdir(avatarDirectory);
  await Promise.all(files.filter(file => file !== filename).map(file => fs.rm(path.join(avatarDirectory, file), { force: true })));
  return path.posix.join('avatar', filename);
}

function defaultProfile(user) {
  const now = new Date().toISOString();
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    userId: Number(user.id),
    account: {
      username: user.username || '',
      nickname: user.nickname || '',
      passwordHash: user.password || user.passwordHash || '',
      avatarFile: '',
      email: user.email || '',
      role: user.role || 'user',
      status: Number(user.status) || 0
    },
    drafts: [],
    preferences: {},
    extensions: {},
    meta: {
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : now,
      updatedAt: now,
      lastLoginAt: null
    }
  };
}

async function readProfile(userId) {
  try {
    return JSON.parse(await fs.readFile(profilePath(userId), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        const legacy = JSON.parse(await fs.readFile(legacyProfilePath(userId), 'utf8'));
        await writeProfile(legacy);
        await fs.rm(legacyProfilePath(userId), { force: true });
        return legacy;
      } catch (legacyError) {
        if (legacyError.code === 'ENOENT') return null;
        throw legacyError;
      }
    }
    throw error;
  }
}

async function writeProfile(profile) {
  await ensureUserDirectories(profile.userId);
  profile.schemaVersion = PROFILE_SCHEMA_VERSION;
  profile.meta = profile.meta || {};
  profile.meta.updatedAt = new Date().toISOString();
  const target = profilePath(profile.userId);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(profile, null, 2), 'utf8');
  await fs.rm(target, { force: true });
  await fs.rename(temporary, target);
  return profile;
}

async function syncUserProfile(user, extra = {}) {
  const existing = await readProfile(user.id);
  const profile = existing || defaultProfile(user);
  const avatarFile = await syncAvatarAsset(user.id, user.avatar ?? profile.account?.avatar ?? '');
  profile.account = {
    ...(profile.account || {}),
    username: user.username ?? profile.account?.username ?? '',
    nickname: user.nickname ?? profile.account?.nickname ?? '',
    passwordHash: user.password ?? user.passwordHash ?? profile.account?.passwordHash ?? '',
    avatarFile: avatarFile || profile.account?.avatarFile || '',
    email: user.email ?? profile.account?.email ?? '',
    role: user.role ?? profile.account?.role ?? 'user',
    status: Number(user.status ?? profile.account?.status ?? 0)
  };
  delete profile.account.avatar;
  profile.drafts = Array.isArray(profile.drafts) ? profile.drafts : [];
  profile.preferences = profile.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  profile.extensions = profile.extensions && typeof profile.extensions === 'object' ? profile.extensions : {};
  profile.meta = { ...(profile.meta || {}), ...extra };
  return writeProfile(profile);
}

async function syncAllProfiles(pool) {
  const [users] = await pool.query(`
    SELECT id, username, password, nickname, email, avatar, role, status, created_at
    FROM users ORDER BY id
  `);
  for (const user of users) await syncUserProfile(user);
  return users.length;
}

function publicProfile(profile) {
  if (!profile) return null;
  const { passwordHash, ...safeAccount } = profile.account || {};
  return { ...profile, account: safeAccount };
}

module.exports = {
  PROFILE_ROOT,
  userProfileDirectory,
  deletedDirectory,
  ensureUserDirectories,
  readProfile,
  writeProfile,
  syncUserProfile,
  syncAllProfiles,
  publicProfile
};
