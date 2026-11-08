import { Request, Response, NextFunction } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ok, ApiError } from '../utils/response';
import { generateSlug } from '../utils/slug';

/**
 * 文章控制器
 * 权限铁律：写操作必须登录；编辑/删除必须校验资源归属（author_id === req.user.id）。
 */

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover: string | null;
  category_id: number | null;
  tags: string | string[] | null; // mysql2 对 JSON 列可能返回字符串或已解析数组
  author_id: number;
  views: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  // JOIN 字段
  author_name?: string;
  author_avatar?: string | null;
  category_name?: string | null;
  category_color?: string | null;
}

function parseTags(tags: PostRow['tags']): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/** 从 Markdown 纯文本截取摘要（去除常见标记符号） */
function buildExcerpt(markdown: string, max = 200): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`\-\[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max) + '…' : plain;
}

function toListItem(row: PostRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    cover: row.cover,
    tags: parseTags(row.tags),
    views: row.views,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: { id: row.author_id, username: row.author_name, avatar: row.author_avatar },
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, color: row.category_color }
      : null,
  };
}

const LIST_SELECT = `
  SELECT p.id, p.title, p.slug, p.excerpt, p.cover, p.tags, p.views, p.status,
         p.created_at, p.updated_at, p.author_id, p.category_id,
         u.username AS author_name, u.avatar AS author_avatar,
         c.name AS category_name, c.color AS category_color
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

/**
 * GET /api/posts
 * 列表：分页 + 分类筛选 + 关键词搜索 + 排序（latest / hottest）
 * query: page, pageSize, category, keyword, sort, author, status
 */
export async function listPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10));
    const category = req.query.category ? String(req.query.category) : null;
    const keyword = req.query.keyword ? String(req.query.keyword).trim() : null;
    const sort = req.query.sort === 'hottest' ? 'hottest' : 'latest';
    const authorId = req.query.author ? parseInt(String(req.query.author), 10) : null;
    // mine=true 时由 authenticateToken 提供 req.user，返回含草稿的全部状态
    const mine = req.query.mine === 'true' && req.user;

    const where: string[] = [];
    const params: unknown[] = [];

    if (mine) {
      where.push('p.author_id = ?');
      params.push(req.user!.id);
    } else {
      where.push("p.status = 'published'");
      if (authorId) {
        where.push('p.author_id = ?');
        params.push(authorId);
      }
    }
    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (keyword) {
      where.push('(p.title LIKE ? OR p.excerpt LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql =
      sort === 'hottest' ? 'ORDER BY p.views DESC, p.created_at DESC' : 'ORDER BY p.created_at DESC';

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
      params
    );
    const total = countRows[0].total as number;

    const [rows] = await pool.query<PostRow[]>(
      `${LIST_SELECT} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    ok(res, {
      list: rows.map(toListItem),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/posts/:id
 * 详情：浏览量 +1；草稿仅作者本人可见（optionalAuth 提供 req.user）
 */
export async function getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new ApiError(400, '文章 ID 不合法');

    const [rows] = await pool.query<PostRow[]>(
      `${LIST_SELECT.replace(/p\.excerpt/, 'p.excerpt, p.content')} WHERE p.id = ? LIMIT 1`,
      [id]
    );
    const post = rows[0];
    if (!post) throw new ApiError(404, '文章不存在');

    const isOwner = req.user?.id === post.author_id;
    if (post.status === 'draft' && !isOwner) throw new ApiError(404, '文章不存在');

    // 浏览量 +1（异步执行，不阻塞响应；作者自己看不计数）
    if (!isOwner) {
      pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [id]).catch(() => undefined);
      post.views += 1;
    }

    ok(res, { ...toListItem(post), content: post.content });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/posts（必须登录）
 * 发布：author_id 从 token 取，禁止客户端伪造
 */
export async function createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, excerpt, cover, categoryId, tags, status } = req.body as {
      title: string;
      content: string;
      excerpt?: string;
      cover?: string;
      categoryId?: number | null;
      tags?: string[];
      status?: 'draft' | 'published';
    };

    // 分类存在性校验（防止脏外键）
    if (categoryId != null) {
      const [cats] = await pool.query<any[]>('SELECT id FROM categories WHERE id = ? LIMIT 1', [
        categoryId,
      ]);
      if (cats.length === 0) throw new ApiError(400, '分类不存在');
    }

    const finalExcerpt = excerpt?.trim() ? excerpt.trim().slice(0, 500) : buildExcerpt(content);
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const finalTags = Array.isArray(tags) && tags.length ? JSON.stringify(tags.slice(0, 10)) : null;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO posts (title, slug, content, excerpt, cover, category_id, tags, author_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        generateSlug(title),
        content,
        finalExcerpt,
        cover?.trim() || null,
        categoryId ?? null,
        finalTags,
        req.user!.id,
        finalStatus,
      ]
    );

    const [rows] = await pool.query<PostRow[]>(`${LIST_SELECT} WHERE p.id = ? LIMIT 1`, [
      result.insertId,
    ]);
    ok(res, toListItem(rows[0]), '发布成功', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/posts/:id（必须登录 + 只能改自己的）
 */
export async function updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new ApiError(400, '文章 ID 不合法');

    const [existing] = await pool.query<PostRow[]>('SELECT * FROM posts WHERE id = ? LIMIT 1', [id]);
    const post = existing[0];
    if (!post) throw new ApiError(404, '文章不存在');
    if (post.author_id !== req.user!.id) throw new ApiError(403, '只能编辑自己的文章');

    const { title, content, excerpt, cover, categoryId, tags, status } = req.body as {
      title?: string;
      content?: string;
      excerpt?: string;
      cover?: string;
      categoryId?: number | null;
      tags?: string[];
      status?: 'draft' | 'published';
    };

    if (categoryId != null) {
      const [cats] = await pool.query<any[]>('SELECT id FROM categories WHERE id = ? LIMIT 1', [
        categoryId,
      ]);
      if (cats.length === 0) throw new ApiError(400, '分类不存在');
    }

    const finalTitle = title?.trim() || post.title;
    const finalContent = content ?? post.content;
    const finalExcerpt = excerpt?.trim()
      ? excerpt.trim().slice(0, 500)
      : content !== undefined
        ? buildExcerpt(finalContent)
        : post.excerpt;
    const finalTags = Array.isArray(tags)
      ? tags.length
        ? JSON.stringify(tags.slice(0, 10))
        : null
      : post.tags;

    await pool.query(
      `UPDATE posts
       SET title = ?, content = ?, excerpt = ?, cover = ?, category_id = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        finalTitle,
        finalContent,
        finalExcerpt,
        cover !== undefined ? cover.trim() || null : post.cover,
        categoryId !== undefined ? categoryId : post.category_id,
        finalTags,
        status === 'draft' || status === 'published' ? status : post.status,
        id,
      ]
    );

    const [rows] = await pool.query<PostRow[]>(`${LIST_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    ok(res, toListItem(rows[0]), '更新成功');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/posts/:id（必须登录 + 只能删自己的）
 */
export async function deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new ApiError(400, '文章 ID 不合法');

    const [existing] = await pool.query<PostRow[]>(
      'SELECT id, author_id FROM posts WHERE id = ? LIMIT 1',
      [id]
    );
    const post = existing[0];
    if (!post) throw new ApiError(404, '文章不存在');
    if (post.author_id !== req.user!.id) throw new ApiError(403, '只能删除自己的文章');

    await pool.query('DELETE FROM posts WHERE id = ?', [id]);
    ok(res, { id }, '删除成功');
  } catch (err) {
    next(err);
  }
}
