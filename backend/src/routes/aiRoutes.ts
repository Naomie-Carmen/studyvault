import { Router } from 'express';
import { extractMaquette, extractTimetable } from '../controllers/aiController';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();

router.use(requireAuth);

// Endpoints d'extraction par IA Gemini (Maquette & Emploi du Temps)
router.post('/extract-maquette', uploadMiddleware.array('images', 10), extractMaquette);
router.post('/extract-timetable', uploadMiddleware.array('images', 10), extractTimetable);

export default router;
