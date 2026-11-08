import { Router } from 'express';
import { body } from 'express-validator';
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// GET /api/posts —— 列表：游客只看已发布；?mine=true 时登录用户看自己的全部（含草稿）
router.get(
  '/',
  (req, res, next) => {
    // mine=true 需要登录态，复用 optionalAuth 再检查
    optionalAuth(req, res, next);
  },
  listPosts
);

// GET /api/posts/:id —— 详情（optionalAuth：游客可看已发布，作者可看自己的草稿）
router.get('/:id', optionalAuth, getPost);

// POST /api/posts —— 发布（必须登录）
router.post(
  '/',
  authenticateToken,
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('标题需为 1-200 字'),
    body('content').isLength({ min: 1 }).withMessage('正文不能为空'),
    body('excerpt').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('摘要最长 500 字'),
    body('cover').optional({ nullable: true }).isURL({ require_tld: false }).withMessage('封面需为合法 URL'),
    body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('分类 ID 不合法'),
    body('tags').optional({ nullable: true }).isArray({ max: 10 }).withMessage('标签最多 10 个'),
    body('tags.*').optional().isString().isLength({ min: 1, max: 30 }).withMessage('单个标签 1-30 字'),
    body('status').optional().isIn(['draft', 'published']).withMessage('状态不合法'),
    validate,
  ],
  createPost
);

// PUT /api/posts/:id —— 编辑（必须登录 + 本人，归属校验在控制器）
router.put(
  '/:id',
  authenticateToken,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('标题需为 1-200 字'),
    body('content').optional().isLength({ min: 1 }).withMessage('正文不能为空'),
    body('excerpt').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('摘要最长 500 字'),
    body('cover').optional({ nullable: true }).isURL({ require_tld: false }).withMessage('封面需为合法 URL'),
    body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('分类 ID 不合法'),
    body('tags').optional({ nullable: true }).isArray({ max: 10 }).withMessage('标签最多 10 个'),
    body('status').optional().isIn(['draft', 'published']).withMessage('状态不合法'),
    validate,
  ],
  updatePost
);

// DELETE /api/posts/:id —— 删除（必须登录 + 本人）
router.delete('/:id', authenticateToken, deletePost);

export default router;
