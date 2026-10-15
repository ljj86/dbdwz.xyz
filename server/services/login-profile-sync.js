const { syncUserProfileFromDatabase } = require('./profile-storage');

function createLoginProfileSync({ getPool, sync = syncUserProfileFromDatabase, maxPending = 64,
  onError = error => console.error('[Profile] 登录资料同步失败:', error.code || error.name || 'Error') } = {}) {
  const pending = new Map();
  let running = false;
  let scheduled = false;
  async function run() {
    scheduled = false;
    if (running) return;
    running = true;
    try {
      while (pending.size) {
        const [userId, lastLoginAt] = pending.entries().next().value;
        pending.delete(userId);
        try { await sync(getPool(), userId, { lastLoginAt }); } catch (error) { onError(error); }
      }
    } finally { running = false; }
  }
  return {
    enqueue(userId, lastLoginAt = new Date().toISOString()) {
      if (!Number.isSafeInteger(userId) || userId <= 0) return false;
      if (!pending.has(userId) && pending.size >= maxPending) return false;
      // Only identity and metadata enter the queue. The worker reads current DB
      // fields under the same per-user lock as foreground profile mutations.
      pending.set(userId, lastLoginAt);
      if (!running && !scheduled) { scheduled = true; setImmediate(run); }
      return true;
    }
  };
}

module.exports = { createLoginProfileSync };
