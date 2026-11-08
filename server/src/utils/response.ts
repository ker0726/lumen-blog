import { Response } from 'express';

/**
 * 统一返回格式：{ success, data, message }
 * 所有控制器必须通过 ok / fail 返回，禁止散落 res.json 裸调用。
 */

export function ok<T>(res: Response, data: T, message = 'ok', status = 200): Response {
  return res.status(status).json({ success: true, data, message });
}

export function fail(res: Response, message: string, status = 400, data: unknown = null): Response {
  return res.status(status).json({ success: false, data, message });
}

/** 业务错误：携带 HTTP 状态码，由集中式错误处理中间件统一捕获 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
