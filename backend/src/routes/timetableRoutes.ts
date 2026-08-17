import { Router } from 'express';
import { 
  createSession, 
  listSessions, 
  getWeek, 
  getToday, 
  getUpcoming, 
  updateSession, 
  deleteSession, 
  getStats, 
  importFile, 
  listImports,
  processImport,
  getSuggestions,
  validateSuggestions,
  rejectSuggestions,
  listArchives,
  getArchive,
  syncArchives
} from '../controllers/timetableController';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();
router.use(requireAuth);

router.post('/sessions', createSession);
router.get('/sessions', listSessions);
router.get('/week', getWeek);
router.get('/today', getToday);
router.get('/upcoming', getUpcoming);
router.get('/stats', getStats);

router.get('/archives', listArchives);
router.get('/archives/:weekStart', getArchive);
router.post('/archives/sync', syncArchives);

router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

router.post('/import', uploadMiddleware.single('file'), importFile);
router.get('/imports', listImports);

// Phase 9 OCR Endpoints
router.post('/imports/:id/process', processImport);
router.get('/imports/:id/suggestions', getSuggestions);
router.post('/imports/:id/validate', validateSuggestions);
router.post('/imports/:id/reject', rejectSuggestions);

export default router;
