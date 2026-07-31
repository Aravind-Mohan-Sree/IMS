import { Router } from 'express';
import { getItems, getItemById, createItem, updateItem, deleteItem } from '../controllers/itemController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Protect item management routes with auth token
router.get('/', authenticateToken as any, getItems as any);
router.get('/:id', authenticateToken as any, getItemById as any);
router.post('/', authenticateToken as any, createItem as any);
router.put('/:id', authenticateToken as any, updateItem as any);
router.delete('/:id', authenticateToken as any, deleteItem as any);

export default router;
