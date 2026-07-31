import { Router } from 'express';
import {
  login,
  register,
  sendSignupOtp,
  getOtpCooldown,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/signup/send-otp', sendSignupOtp);
router.post('/otp-cooldown', getOtpCooldown);
router.post('/register', register);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticateToken as any, getMe as any);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
