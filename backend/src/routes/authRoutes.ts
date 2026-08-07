import { Router } from 'express';
import { 
  register, 
  login, 
  refresh, 
  logout, 
  forgotPassword, 
  resetPassword 
} from '../controllers/authController';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);

export default router;
