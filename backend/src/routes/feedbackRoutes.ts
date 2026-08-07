import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import * as feedbackController from '../controllers/feedbackController';

const router = Router();

// Submit feedback (authenticated)
router.post('/', requireAuth, feedbackController.submitFeedback);

// List feedbacks (admin only)
router.get('/', requireAuth, requireAdmin, feedbackController.getFeedbacks);

export default router;
