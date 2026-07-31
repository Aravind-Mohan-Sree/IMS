import { Router } from 'express';
import { exportExcel, exportPDF, exportEmail } from '../controllers/exportController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/excel', authenticateToken as any, exportExcel as any);
router.get('/pdf', authenticateToken as any, exportPDF as any);
router.post('/email', authenticateToken as any, exportEmail as any);

export default router;
