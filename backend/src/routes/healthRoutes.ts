import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    System health check & diagnostics
 * @access  Public
 */
router.get('/', getHealthStatus);

export default router;
