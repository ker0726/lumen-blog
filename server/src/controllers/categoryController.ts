import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { ok } from '../utils/response';

/**
 * GET /api/categories
 * 全部分类，LEFT JOIN 实时统计各分类下「已发布」文章数
 */
export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT c.id, c.name, c.slug, c.description, c.color,
              COUNT(p.id) AS postCount
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       GROUP BY c.id, c.name, c.slug, c.description, c.color
       ORDER BY c.id ASC`
    );
    ok(res, rows);
  } catch (err) {
    next(err);
  }
}
