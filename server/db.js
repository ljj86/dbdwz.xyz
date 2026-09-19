const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { syncAllProfiles } = require('./services/profile-storage');

function requiredEnv(name) {
  const value = String(process.env[name] || '');
  if (!value) throw new Error(`${name} 必须在 server/.env 中配置`);
  return value;
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  port: Number(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4'
};

const DB_NAME = requiredEnv('DB_NAME');
const DB_AUTO_CREATE = String(process.env.DB_AUTO_CREATE ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')).toLowerCase() === 'true';
if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) throw new Error('DB_NAME 只能包含字母、数字和下划线');

let pool = null;

// 初始化：创建数据库、连接池与数据表。账号必须由部署者单独创建。
async function init() {
  // 本地开发可自动建库；生产环境由部署脚本提前创建并授权。
  if (DB_AUTO_CREATE) {
    const tempPool = mysql.createPool({ ...DB_CONFIG, connectionLimit: 1 });
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempPool.end();
  }

  // 第二步：使用配置的数据库创建正式连接池
  pool = mysql.createPool({
    ...DB_CONFIG,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // 第三步：建表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nickname VARCHAR(50) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      avatar LONGTEXT,
      status TINYINT DEFAULT 1,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [avatarColumns] = await pool.query(`
    SELECT DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
  `, [DB_NAME]);
  if (avatarColumns.length && avatarColumns[0].DATA_TYPE !== 'longtext') {
    await pool.query('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      folder VARCHAR(120) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      description TEXT,
      tester_only TINYINT NOT NULL DEFAULT 0,
      is_published TINYINT NOT NULL DEFAULT 1,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_material_user (user_id),
      INDEX idx_material_time (uploaded_at),
      CONSTRAINT fk_material_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [materialStatusColumns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'meeting_materials' AND COLUMN_NAME = 'is_published'
  `, [DB_NAME]);
  if (materialStatusColumns.length === 0) {
    await pool.query('ALTER TABLE meeting_materials ADD COLUMN is_published TINYINT NOT NULL DEFAULT 1 AFTER description');
  }

  const [testerOnlyColumns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'meeting_materials' AND COLUMN_NAME = 'tester_only'
  `, [DB_NAME]);
  if (testerOnlyColumns.length === 0) {
    await pool.query('ALTER TABLE meeting_materials ADD COLUMN tester_only TINYINT NOT NULL DEFAULT 0 AFTER description');
  }

  const [materialUpdatedColumns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'meeting_materials' AND COLUMN_NAME = 'updated_at'
  `, [DB_NAME]);
  if (materialUpdatedColumns.length === 0) {
    await pool.query('ALTER TABLE meeting_materials ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER uploaded_at');
    await pool.query('UPDATE meeting_materials SET updated_at = uploaded_at');
  }

  const [trashColumns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'meeting_materials'
      AND COLUMN_NAME IN ('deleted_at', 'delete_expires_at')
  `, [DB_NAME]);
  const trashColumnNames = new Set(trashColumns.map(column => column.COLUMN_NAME));
  if (!trashColumnNames.has('deleted_at')) {
    await pool.query('ALTER TABLE meeting_materials ADD COLUMN deleted_at TIMESTAMP NULL AFTER is_published');
  }
  if (!trashColumnNames.has('delete_expires_at')) {
    await pool.query('ALTER TABLE meeting_materials ADD COLUMN delete_expires_at TIMESTAMP NULL AFTER deleted_at');
  }
  await pool.query(`
    UPDATE meeting_materials
    SET deleted_at = COALESCE(deleted_at, NOW()),
        delete_expires_at = COALESCE(delete_expires_at, DATE_ADD(NOW(), INTERVAL 3 DAY))
    WHERE is_published = 0
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_material_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      file_size BIGINT DEFAULT 0,
      mime_type VARCHAR(120) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_file_material (material_id),
      CONSTRAINT fk_file_material FOREIGN KEY (material_id) REFERENCES meeting_materials(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recommended_resources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500) NOT NULL DEFAULT '',
      url VARCHAR(2000) NOT NULL,
      url_hash CHAR(64) NOT NULL UNIQUE,
      category VARCHAR(32) NOT NULL,
      icon MEDIUMTEXT,
      user_id INT NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_resource_category (category),
      INDEX idx_resource_status (status),
      CONSTRAINT fk_resource_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_spaces (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500) NOT NULL DEFAULT '',
      owner_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_collaboration_owner (owner_id),
      CONSTRAINT fk_collaboration_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_members (
      space_id INT NOT NULL,
      user_id INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (space_id, user_id),
      CONSTRAINT fk_collaboration_member_space FOREIGN KEY (space_id) REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
      CONSTRAINT fk_collaboration_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_papers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      space_id INT NOT NULL,
      uploader_id INT NOT NULL,
      title VARCHAR(180) NOT NULL,
      authors VARCHAR(300) NOT NULL DEFAULT '',
      note VARCHAR(1000) NOT NULL DEFAULT '',
      category VARCHAR(40) NOT NULL DEFAULT '未分类',
      filename VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      mime_type VARCHAR(120) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paper_space_time (space_id, created_at),
      CONSTRAINT fk_paper_space FOREIGN KEY (space_id) REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
      CONSTRAINT fk_paper_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [paperCategoryColumns] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'collaboration_papers' AND COLUMN_NAME = 'category'
  `, [DB_NAME]);
  if (!paperCategoryColumns.length) {
    await pool.query("ALTER TABLE collaboration_papers ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT '未分类' AFTER note");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      space_id INT NOT NULL,
      name VARCHAR(40) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_collaboration_category (space_id, name),
      CONSTRAINT fk_category_space FOREIGN KEY (space_id) REFERENCES collaboration_spaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_presence (
      space_id INT NOT NULL,
      user_id INT NOT NULL,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (space_id, user_id),
      CONSTRAINT fk_presence_space FOREIGN KEY (space_id) REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
      CONSTRAINT fk_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [collaborationSpaces] = await pool.query('SELECT id FROM collaboration_spaces');
  const defaultCategories = ['未分类', '待阅读', '重点精读', '方法参考', '已归档'];
  for (const space of collaborationSpaces) {
    for (let index = 0; index < defaultCategories.length; index += 1) {
      await pool.query(
        'INSERT IGNORE INTO collaboration_categories (space_id,name,sort_order) VALUES (?,?,?)',
        [space.id, defaultCategories[index], index]
      );
    }
  }

  const profileCount = await syncAllProfiles(pool);
  console.log(`[Profile] 已同步 ${profileCount} 个用户资料文件`);

  console.log(`[DB] 数据库 ${DB_NAME} 初始化完成`);
}

function getPool() {
  if (!pool) throw new Error('数据库未初始化，请先调用 init()');
  return pool;
}

async function getConnection() {
  return getPool().getConnection();
}

module.exports = { init, getPool, getConnection };
