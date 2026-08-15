import { Router } from 'express';
import { extractMaquette, extractTimetable, debugAiConfig, structureTextWithAi } from '../controllers/aiController';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();

// Endpoints publics (diagnostic, structuration texte et vision directe)
router.get('/debug', debugAiConfig);
router.post('/structure', structureTextWithAi);
router.post('/extract-maquette', uploadMiddleware.array('images', 10), extractMaquette);
router.post('/extract-timetable', uploadMiddleware.array('images', 10), extractTimetable);

export default router;
