import { Router } from 'express';
import { getVersion } from '../controllers/versionController';

const router = Router();

// GET /api/v1/version — public, no auth required
router.get('/', getVersion);

export default router;
