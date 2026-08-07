import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  getUniversities, 
  patchSemester 
} from '../controllers/academicProfileController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/universities', getUniversities);

// Protected routes requiring authentication
router.get('/', requireAuth, getProfile);
router.post('/', requireAuth, updateProfile);
router.patch('/semesters/:id', requireAuth, patchSemester);

export default router;
