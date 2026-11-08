import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { fail } from '../utils/response';

/** 注入到 req.user 的载荷 */
export interface JwtUserPayload {
  id: number;
  username: string;
  email: string;
}

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function verify(token: string): JwtUserPayload | null {
  try {
    return jwt.verify(token, env.jwt.secret) as JwtUserPayload;
  } catch {
    return null;
  }
}

/**
 * 强制鉴权中间件：校验 JWT 并注入 req.user。
 * 用于发布 / 编辑 / 删除文章等必须登录的接口。
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    fail(res, '未登录或登录已过期', 401);
    return;
  }
  const payload = verify(token);
  if (!payload) {
    fail(res, '登录凭证无效，请重新登录', 401);
    return;
  }
  req.user = payload;
  next();
}

/**
 * 可选鉴权中间件：有合法 token 则注入 req.user，没有也放行。
 * 用于文章详情等访客与登录用户均可访问的场景。
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const payload = verify(token);
    if (payload) req.user = payload;
  }
  next();
}
