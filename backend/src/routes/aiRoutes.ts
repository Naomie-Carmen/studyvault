import { Router } from 'express';
import { extractMaquette, extractTimetable, debugAiConfig, structureTextWithAi } from '../controllers/aiController';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();

// Endpoint de diagnostic sans authentification
router.get('/debug', debugAiConfig);

// Endpoints authentifiés
router.use(requireAuth);

router.post('/structure', structureTextWithAi);
router.post('/extract-maquette', uploadMiddleware.array('images', 10), extractMaquette);
router.post('/extract-timetable', uploadMiddleware.array('images', 10), extractTimetable);

export default router;
