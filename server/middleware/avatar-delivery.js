// Admit avatar reads before loading large database data URLs. Waiting entries
// contain only request/response contexts; conversion has its own smaller limits.
function createAvatarDelivery({ maxConcurrent = 2, maxPending = 64 } = {}) {
  const pending = [];
  let running = 0;
  function cleanup(job) {
    job.req.removeListener('aborted', job.cancel);
    job.res.removeListener('close', job.cancel);
  }
  function pump() {
    while (running < maxConcurrent && pending.length) execute(pending.shift());
  }
  async function execute(job) {
    job.started = true;
    running += 1;
    try {
      if (!job.cancelled && !job.req.aborted && !job.res.destroyed) await job.handler(job.req, job.res, job.next);
    } catch (error) {
      if (!job.res.destroyed) job.next(error);
    } finally {
      cleanup(job);
      running -= 1;
      pump();
    }
  }
  return handler => (req, res, next) => {
    if (req.aborted || res.destroyed) return;
    if (running >= maxConcurrent && pending.length >= maxPending) return res.set('Retry-After', '1').status(429).end();
    const job = { req, res, next, handler, started: false, cancelled: false };
    job.cancel = () => {
      job.cancelled = true;
      if (!job.started) {
        const index = pending.indexOf(job);
        if (index >= 0) pending.splice(index, 1);
        cleanup(job);
      }
      // An active read/Sharp operation retains its permit until its promise
      // completes, so repeated disconnects cannot grow active image buffers.
    };
    req.once('aborted', job.cancel);
    res.once('close', job.cancel);
    if (running < maxConcurrent) execute(job);
    else pending.push(job);
  };
}

module.exports = { createAvatarDelivery };
