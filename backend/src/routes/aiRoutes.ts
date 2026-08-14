import { Router } from 'express';
import { extractMaquette, extractTimetable, debugAiConfig, structureTextWithAi } from '../controllers/aiController';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();

// Endpoints publics (diagnostic et structuration texte IA)
router.get('/debug', debugAiConfig);
router.post('/structure', structureTextWithAi);

// Endpoints authentifiés avec upload multipart
router.use(requireAuth);

router.post('/extract-maquette', uploadMiddleware.array('images', 10), extractMaquette);
router.post('/extract-timetable', uploadMiddleware.array('images', 10), extractTimetable);

export default router;
