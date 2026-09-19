const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const monitoredPath = path.resolve(process.env.STORAGE_MONITOR_PATH || path.join(__dirname, '..', '..'));

function percent(used, total) {
  return total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0;
}

// GET /api/system/status - 当前网站服务器磁盘和运行内存
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const stats = await fs.statfs(monitoredPath, { bigint: true });
    const totalBytes = Number(stats.blocks * stats.bsize);
    const freeBlocks = typeof stats.bavail === 'bigint' ? stats.bavail : stats.bfree;
    const freeBytes = Number(freeBlocks * stats.bsize);
    const usedBytes = Math.max(0, totalBytes - freeBytes);

    const memoryTotalBytes = os.totalmem();
    const memoryFreeBytes = os.freemem();
    const memoryUsedBytes = Math.max(0, memoryTotalBytes - memoryFreeBytes);

    res.json({
      code: 200,
      data: {
        storage: {
          label: process.env.STORAGE_LABEL || '网站所在磁盘',
          totalBytes,
          usedBytes,
          freeBytes,
          usagePercent: percent(usedBytes, totalBytes)
        },
        memory: {
          label: '服务器运行内存',
          totalBytes: memoryTotalBytes,
          usedBytes: memoryUsedBytes,
          freeBytes: memoryFreeBytes,
          usagePercent: percent(memoryUsedBytes, memoryTotalBytes)
        },
        checkedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('读取服务器容量失败:', error);
    res.status(500).json({ code: 500, message: '暂时无法读取服务器容量' });
  }
});

module.exports = router;
