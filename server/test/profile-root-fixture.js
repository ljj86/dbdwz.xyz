const assert = require('assert/strict');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

async function main() {
  if (!process.env.SECURITY_TEST_TMP) throw new Error('A prepared temporary fixture directory is required');
  const root = await fs.mkdtemp(path.join(process.env.SECURITY_TEST_TMP, 'profile-root-'));
  try {
    delete process.env.PROFILE_ROOT;
    const profileModule = require.resolve('../services/profile-storage');
    assert.equal(require(profileModule).PROFILE_ROOT, path.resolve(__dirname, '..', '..', '个人资料'));
    delete require.cache[profileModule];
    process.env.PROFILE_ROOT = path.join(root, 'custom-profiles');
    process.env.RESOURCE_ROOT = path.join(root, 'resources');
    process.env.MATERIAL_STAGING_ROOT = path.join(root, 'staging');
    const profile = require(profileModule);
    const material = { id: 901, folder: 'synthetic-material', user_id: 99 };
    require.cache[require.resolve('../db')] = { exports: { getPool: () => ({
      query: async sql => {
        assert.equal(sql, 'SELECT id, folder, user_id FROM meeting_materials');
        return [[material]];
      }
    }) } };
    require.cache[require.resolve('../services/preview-storage')] = { exports: { cancelMaterialPreviews: async () => () => {} } };
    const storage = require('../services/upload-storage');
    const trash = require('../services/trash-storage');
    assert.equal(profile.PROFILE_ROOT, process.env.PROFILE_ROOT);
    assert.equal(storage.profileRoot, profile.PROFILE_ROOT);
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#c00' } }).png().toBuffer();
    const saved = await profile.syncUserProfile({ id: 99, username: 'synthetic', password: 'synthetic-hash', avatar: `data:image/png;base64,${image.toString('base64')}` });
    const userRoot = path.join(profile.PROFILE_ROOT, 'user-99');
    assert.equal(profile.userProfileDirectory(99), userRoot);
    assert.equal(JSON.parse(await fs.readFile(path.join(userRoot, 'profile.json'), 'utf8')).userId, 99);
    assert.ok((await fs.stat(path.join(userRoot, saved.account.avatarFile))).size > 0);
    const source = path.join(storage.resourceRoot, material.folder);
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, 'fixture.bin'), Buffer.alloc(37));
    assert.equal((await storage.storageUsage(99)).account.bytes, 37);
    const target = await trash.moveToTrash(material);
    assert.equal(target, path.join(userRoot, 'deleted', '901-synthetic-material'));
    assert.equal((await fs.stat(path.join(target, 'fixture.bin'))).size, 37);
    const used = await storage.storageUsage(99);
    assert.equal(used.account.bytes, 37);
    assert.equal(used.global.bytes, 37);
    assert.equal(used.account.files, 1);
    assert.equal((await storage.storageUsage(100)).account.bytes, 0);
    await trash.restoreFromTrash(material);
    assert.equal((await storage.storageUsage(99)).account.bytes, 37);
    await trash.permanentlyRemove(material);
    assert.equal((await storage.storageUsage(99)).global.bytes, 0);
    console.log('custom profile root: profile, avatar, trash and quota agree (37 synthetic bytes; other account 0)');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
