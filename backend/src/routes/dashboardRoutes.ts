import { Router } from 'express';
import { getStats } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use(requireAuth);

router.get('/stats', getStats);

export default router;
