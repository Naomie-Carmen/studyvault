import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import * as betaController from '../controllers/betaController';

const router = Router();

// Public routes
router.post('/validate', betaController.validateCode);
router.post('/waitlist', betaController.joinWaitlistController);

// Authenticated user routes
router.get('/status', requireAuth, betaController.getStatus);

// Admin-only routes
router.post('/invite', requireAuth, requireAdmin, betaController.inviteUser);

export default router;
