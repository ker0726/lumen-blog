import { Request, Response, NextFunction } from 'express';
import { ApiError, fail } from '../utils/response';

/** 404 兜底：未匹配到任何路由 */
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, `接口不存在: ${req.method} ${req.path}`, 404);
}

/**
 * 集中式错误处理中间件（必须在所有路由之后注册）。
 * - ApiError：业务错误，按自带状态码返回
 * - ER_DUP_ENTRY：MySQL 唯一索引冲突，转 409
 * - 其余：未知错误，记录日志后返回 500，不泄露内部细节
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    fail(res, err.message, err.status);
    return;
  }

  if (typeof err === 'object' && err !== null && 'code' in err) {
    const mysqlErr = err as { code: string; message?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      fail(res, '数据已存在（唯一性冲突）', 409);
      return;
    }
    console.error('[error] MySQL 错误:', mysqlErr.code, mysqlErr.message);
    fail(res, '数据库操作失败', 500);
    return;
  }

  // SQLite（node:sqlite）唯一约束冲突
  if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
    fail(res, '数据已存在（唯一性冲突）', 409);
    return;
  }

  // SQL Server 唯一约束冲突（错误号 2627/2601，或消息含 duplicate key）
  if (
    err instanceof Error &&
    (/duplicate key/i.test(err.message) || /违反了 PRIMARY KEY|UNIQUE/i.test(err.message))
  ) {
    fail(res, '数据已存在（唯一性冲突）', 409);
    return;
  }
  if (typeof err === 'object' && err !== null && 'number' in err) {
    const mssqlErr = err as { number: number; message?: string };
    if (mssqlErr.number === 2627 || mssqlErr.number === 2601) {
      fail(res, '数据已存在（唯一性冲突）', 409);
      return;
    }
  }

  console.error('[error] 未处理异常:', err);
  fail(res, '服务器内部错误', 500);
}
