import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  recordCustomerPayment
} from '../controllers/customerController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateToken as any, getCustomers as any);
router.get('/:id', authenticateToken as any, getCustomerById as any);
router.post('/', authenticateToken as any, createCustomer as any);
router.post('/:id/payments', authenticateToken as any, recordCustomerPayment as any);
router.put('/:id', authenticateToken as any, updateCustomer as any);
router.delete('/:id', authenticateToken as any, deleteCustomer as any);

export default router;
