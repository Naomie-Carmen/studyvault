import { Router } from 'express';
import { exportData, deleteAccount, updateConsent, getConsent, getPrivacyPolicy } from '../controllers/rgpdController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public route
router.get('/privacy-policy', getPrivacyPolicy);

// Protected RGPD routes
router.use(requireAuth);
router.get('/export', exportData);
router.post('/delete-account', deleteAccount);
router.get('/consent', getConsent);
router.post('/consent', updateConsent);

export default router;
