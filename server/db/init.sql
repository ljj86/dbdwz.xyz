-- dbdwz 账号系统数据库初始化
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS dbdwz DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dbdwz;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(bcrypt)',
  nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
  email VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  avatar LONGTEXT COMMENT '头像图片数据',
  status TINYINT DEFAULT 1 COMMENT '状态: 1=在线, 0=离线',
  role VARCHAR(20) DEFAULT 'user' COMMENT '角色: admin/user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 不在公开脚本中创建默认账号。管理员应通过受控的部署流程单独创建。
