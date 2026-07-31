import { Router } from 'express';
import { getSales, getSaleById, createSale } from '../controllers/saleController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateToken as any, getSales as any);
router.get('/:id', authenticateToken as any, getSaleById as any);
router.post('/', authenticateToken as any, createSale as any);

export default router;
