import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { getAdminMetrics } from '../controllers/adminDashboardController';

const router = Router();

// GET /api/v1/admin/dashboard (admin only)
router.get('/dashboard', requireAuth, requireAdmin, getAdminMetrics);

export default router;
