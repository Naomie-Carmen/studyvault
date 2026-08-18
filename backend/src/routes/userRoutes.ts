import { Router } from 'express';
import { getMe } from '../controllers/userController';
import { exportData, deleteAccount, acceptConsent } from '../controllers/rgpdController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/me', requireAuth, getMe);
router.delete('/me', requireAuth, deleteAccount);
router.get('/me/export', requireAuth, exportData);
router.post('/consent', requireAuth, acceptConsent);

export default router;
