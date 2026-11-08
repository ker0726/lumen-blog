import express from 'express';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import categoryRoutes from './routes/categories';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { ok } from './utils/response';

/**
 * Express 应用装配。
 * 职责：中间件挂载 → 路由挂载 → 404/错误处理兜底。
 * 不处理数据库初始化（见 index.ts）。
 */
export function createApp(): express.Express {
  const app = express();

  // JSON 解析（限制体积，防大包攻击）
  app.use(express.json({ limit: '1mb' }));

  // 开发环境简易 CORS：生产建议由反向代理同源部署或收紧 origin
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 健康检查
  app.get('/api/health', (_req, res) => {
    ok(res, { uptime: process.uptime() }, 'LUMEN API is running');
  });

  // 业务路由
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/categories', categoryRoutes);

  // 兜底：404 + 集中式错误处理（顺序不可调换）
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
