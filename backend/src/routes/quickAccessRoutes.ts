import { Router } from 'express';
import { 
  addQuickAccess, 
  removeQuickAccess, 
  getQuickAccess, 
  reorderQuickAccess 
} from '../controllers/quickAccessController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use(requireAuth);

router.get('/', getQuickAccess);
router.post('/', addQuickAccess);
router.delete('/:document_id', removeQuickAccess);
router.patch('/reorder', reorderQuickAccess);

export default router;
