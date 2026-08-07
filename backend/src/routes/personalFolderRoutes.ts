import { Router } from 'express';
import { 
  createPersonalFolder, 
  getPersonalFolders, 
  deletePersonalFolder 
} from '../controllers/documentController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.post('/', createPersonalFolder);
router.get('/', getPersonalFolders);
router.delete('/:id', deletePersonalFolder);

export default router;
