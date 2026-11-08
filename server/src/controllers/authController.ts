import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { env } from '../config/env';
import { ok, ApiError } from '../utils/response';

const SALT_ROUNDS = 10;

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
}

/** 剔除敏感字段后的安全用户对象 */
function toSafeUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

function signToken(user: UserRow): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * POST /api/auth/register
 * 注册：参数校验（路由层）→ 查重 → bcrypt 加密 → 入库 → 返回 JWT
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    // 查重：用户名或邮箱任一冲突即拒绝（友好提示，数据库唯一索引兜底并发）
    const [dupes] = await pool.query<UserRow[]>(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 2',
      [username, email]
    );
    if (dupes.length > 0) {
      const nameTaken = dupes.some((d) => d.username === username);
      const emailTaken = dupes.some((d) => d.email === email);
      throw new ApiError(
        409,
        nameTaken && emailTaken ? '用户名与邮箱均已被注册'
          : nameTaken ? '用户名已被占用'
          : '邮箱已被注册'
      );
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [
      result.insertId,
    ]);
    const user = rows[0];

    ok(res, { token: signToken(user), user: toSafeUser(user) }, '注册成功', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * 登录：按邮箱查用户 → bcrypt 比对 → 返回 JWT + 用户信息
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [
      email,
    ]);
    const user = rows[0];
    // 统一模糊报错，避免暴露「邮箱是否存在」
    if (!user) throw new ApiError(401, '邮箱或密码错误');

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) throw new ApiError(401, '邮箱或密码错误');

    ok(res, { token: signToken(user), user: toSafeUser(user) }, '登录成功');
  } catch (err) {
    next(err);
  }
}
