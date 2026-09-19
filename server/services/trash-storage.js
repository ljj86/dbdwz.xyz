const fs = require('fs/promises');
const path = require('path');
const { deletedDirectory, ensureUserDirectories } = require('./profile-storage');

const RESOURCE_ROOT = path.resolve(__dirname, '..', '..', '资源');
const RETENTION_DAYS = 3;

function materialTrashDirectory(userId, materialId, folder) {
  const safeFolder = path.basename(String(folder || 'material')).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(deletedDirectory(userId), `${Number(materialId)}-${safeFolder}`);
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function moveToTrash(material) {
  await ensureUserDirectories(material.user_id);
  const source = path.join(RESOURCE_ROOT, path.basename(material.folder));
  const target = materialTrashDirectory(material.user_id, material.id, material.folder);
  if (await pathExists(target)) return target;
  if (!(await pathExists(source))) throw new Error('原始资料文件夹不存在，无法安全下架');
  await fs.rm(target, { recursive: true, force: true });
  await fs.rename(source, target);
  return target;
}

async function restoreFromTrash(material) {
  await fs.mkdir(RESOURCE_ROOT, { recursive: true });
  const source = materialTrashDirectory(material.user_id, material.id, material.folder);
  if (!(await pathExists(source))) throw new Error('回收站文件不存在，无法重新上架');

  let folder = path.basename(material.folder);
  let target = path.join(RESOURCE_ROOT, folder);
  if (await pathExists(target)) {
    folder = `${path.parse(folder).name}_restored_${Date.now()}`;
    target = path.join(RESOURCE_ROOT, folder);
  }
  await fs.rename(source, target);
  return { folder, target };
}

async function rollbackRestore(material, restored) {
  if (!restored || !(await pathExists(restored.target))) return;
  await ensureUserDirectories(material.user_id);
  await fs.rename(restored.target, materialTrashDirectory(material.user_id, material.id, material.folder));
}

async function rollbackTrash(material) {
  const source = materialTrashDirectory(material.user_id, material.id, material.folder);
  if (!(await pathExists(source))) return;
  await fs.mkdir(RESOURCE_ROOT, { recursive: true });
  await fs.rename(source, path.join(RESOURCE_ROOT, path.basename(material.folder)));
}

async function permanentlyRemove(material) {
  await fs.rm(materialTrashDirectory(material.user_id, material.id, material.folder), { recursive: true, force: true });
  // 兼容旧版下架记录：如果文件仍留在资源目录，也一并清理。
  await fs.rm(path.join(RESOURCE_ROOT, path.basename(material.folder)), { recursive: true, force: true });
}

async function updateTrashMetadata(material, title, description) {
  const root = materialTrashDirectory(material.user_id, material.id, material.folder);
  const metadataPath = path.join(root, 'metadata.json');
  try {
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    metadata.title = title;
    metadata.description = description;
    metadata.updatedAt = new Date().toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }

  const notePath = path.join(root, '资料说明.txt');
  const note = [`资料标题：${title}`, '', '资料说明：', description || '无'].join('\r\n');
  await fs.writeFile(notePath, note, 'utf8').catch(() => {});
}

async function cleanupExpiredTrash(pool) {
  const [expired] = await pool.query(`
    SELECT id, folder, user_id
    FROM meeting_materials
    WHERE is_published = 0 AND delete_expires_at IS NOT NULL AND delete_expires_at <= NOW()
  `);
  for (const material of expired) {
    await permanentlyRemove(material).catch(error => console.error(`[Trash] 清理资料 ${material.id} 文件失败:`, error.message));
    await pool.query('DELETE FROM meeting_materials WHERE id = ? AND is_published = 0', [material.id]);
  }
  if (expired.length) console.log(`[Trash] 已自动清理 ${expired.length} 条超过 ${RETENTION_DAYS} 天的资料`);
  return expired.length;
}

module.exports = {
  RETENTION_DAYS,
  materialTrashDirectory,
  moveToTrash,
  restoreFromTrash,
  rollbackRestore,
  rollbackTrash,
  permanentlyRemove,
  updateTrashMetadata,
  cleanupExpiredTrash
};
