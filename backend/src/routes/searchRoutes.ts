import { Router } from 'express';
import { search } from '../controllers/searchController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use(requireAuth);

router.get('/', search);

export default router;
