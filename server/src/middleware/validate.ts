import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { fail } from '../utils/response';

/**
 * express-validator 结果收集中间件：
 * 放在各路由的校验链之后，统一把校验失败转为 400 响应。
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    fail(res, first.msg as string, 400, errors.array());
    return;
  }
  next();
}
