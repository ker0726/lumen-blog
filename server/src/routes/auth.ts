import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/authController';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名需为 3-20 位')
      .matches(/^[\w\u4e00-\u9fa5]+$/)
      .withMessage('用户名仅支持中英文、数字与下划线'),
    body('email').trim().isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
    body('password').isLength({ min: 8, max: 72 }).withMessage('密码需为 8-72 位'),
    validate,
  ],
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
    body('password').notEmpty().withMessage('密码不能为空'),
    validate,
  ],
  login
);

export default router;
