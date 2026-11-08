import { createApp } from './app';
import { initDatabase } from './db/init';
import { env } from './config/env';

/**
 * 服务入口：
 * 严格按「先初始化数据库，再监听端口」的顺序启动，
 * 保证服务对外可用时表结构必然就绪。
 */
async function bootstrap(): Promise<void> {
  console.log('[server] LUMEN API 启动中…');

  await initDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] 已启动: http://localhost:${env.port}`);
    console.log(`[server] 健康检查: http://localhost:${env.port}/api/health`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] 启动失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
