import { Router } from 'express';
import { getSalesReport, getItemsReport, getCustomerLedger, getCategoryValuation } from '../controllers/reportController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/sales', authenticateToken as any, getSalesReport as any);
router.get('/items', authenticateToken as any, getItemsReport as any);
router.get('/category-valuation', authenticateToken as any, getCategoryValuation as any);
router.get('/customer-ledger/:customerId', authenticateToken as any, getCustomerLedger as any);

export default router;
