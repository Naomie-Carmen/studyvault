import { Router } from 'express';
import { getConfig, updateConfig, upsertGrades, getAverages } from '../controllers/gradeController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/config', getConfig);
router.post('/config', updateConfig);
router.post('/', upsertGrades);
router.get('/averages', getAverages);

export default router;
