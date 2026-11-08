import { Router } from 'express';
import { listCategories } from '../controllers/categoryController';

const router = Router();

// GET /api/categories —— 全部分类（含文章数统计）
router.get('/', listCategories);

export default router;
