const bcrypt = require('bcryptjs');
const { init, getPool } = require('../db');

async function main() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const nickname = String(process.env.ADMIN_NICKNAME || 'Administrator').trim();

  if (!/^[a-zA-Z0-9_]{2,50}$/.test(username)) {
    throw new Error('请通过 ADMIN_USERNAME 提供 2-50 位字母、数字或下划线账号');
  }
  if (password.length < 12 || password.length > 72) {
    throw new Error('请通过 ADMIN_PASSWORD 提供 12-72 位强密码');
  }
  if (!nickname || nickname.length > 50) throw new Error('ADMIN_NICKNAME 长度必须为 1-50 个字符');

  await init();
  const pool = getPool();
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (existing.length) throw new Error('该管理员账号已存在，脚本不会覆盖密码');
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (username, password, nickname, email, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, nickname, '', 'admin', 1]
    );
    console.log('管理员账号已创建。');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
