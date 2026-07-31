import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateToken as any, getCategories as any);
router.post('/', authenticateToken as any, createCategory as any);
router.put('/:id', authenticateToken as any, updateCategory as any);
router.delete('/:id', authenticateToken as any, deleteCategory as any);

export default router;
