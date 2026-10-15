const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { init, getPool } = require('./db');
const { authMiddleware, tutorialStaticMiddleware } = require('./middleware/auth');
const { materialFiles } = require('./middleware/material-files');
const { cleanupExpiredTrash } = require('./services/trash-storage');
const { resumePendingPreviews } = require('./services/preview-storage');
const { version: appVersion } = require('./package.json');

const authRoutes = require('./routes/auth');
const materialRoutes = require('./routes/materials');
const systemRoutes = require('./routes/system');
const resourceRoutes = require('./routes/resources');
const collaborationRoutes = require('./routes/collaboration');
const appUpdateRoutes = require('./routes/app-updates');

const app = express();
const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT 必须在 server/.env 中配置为有效端口');
}
const HOST = process.env.HOST || '127.0.0.1';
const frontendRoot = path.resolve(__dirname, '..', 'dist', 'build', 'h5');
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

// 中间件
app.set('trust proxy', 'loopback');
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error('CORS origin not allowed'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/app-updates', appUpdateRoutes);
app.use('/static/web', tutorialStaticMiddleware);
app.use('/materials-files', authMiddleware, materialFiles);

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ code: 200, message: 'ok', service: `app-v${appVersion}`, database: 'connected', time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ code: 503, message: 'database unavailable', service: `app-v${appVersion}`, database: 'disconnected', time: new Date().toISOString() });
  }
});

// 生产环境由同一个 Express 直接托管已构建 H5；hash 路由不会依赖服务器重写。
app.use(express.static(frontendRoot));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/materials-files/')) return next();
  res.sendFile(path.join(frontendRoot, 'index.html'));
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库（创建库、数据表与连接池；不自动创建任何账号）
    await init();

    // 验证连接
    const pool = getPool();
    const conn = await pool.getConnection();
    console.log('[DB] MySQL 连接成功');
    conn.release();

    await cleanupExpiredTrash(pool);
    const trashCleanupTimer = setInterval(() => {
      cleanupExpiredTrash(pool).catch(error => console.error('[Trash] 自动清理失败:', error.message));
    }, 60 * 1000);
    trashCleanupTimer.unref();
    await resumePendingPreviews();

    app.listen(PORT, HOST, () => {
      console.log(`[Server] 后端运行在 http://${HOST}:${PORT}`);
      console.log(`[API] 登录: POST http://${HOST}:${PORT}/api/auth/login`);
    });
  } catch (err) {
    console.error('[Error] 启动失败:', err.message);
    process.exit(1);
  }
}

start();
