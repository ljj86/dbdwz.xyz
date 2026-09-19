const {
  backfillAllPreviews,
  waitForIdle,
  getQueueStatus,
  resourceRoot
} = require('../services/preview-storage');

async function main() {
  const force = process.argv.includes('--force');
  console.log(`[preview] 扫描目录：${resourceRoot}`);
  const count = await backfillAllPreviews({ force });
  console.log(`[preview] 已登记 ${count} 个文件，转换队列并发数：${getQueueStatus().concurrency}`);
  await waitForIdle();
  console.log('[preview] 全部预览处理完成');
}

main().catch((error) => {
  console.error('[preview] 补建失败:', error);
  process.exitCode = 1;
});
