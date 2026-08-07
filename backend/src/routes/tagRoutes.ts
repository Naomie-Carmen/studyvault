import { Router } from 'express';
import { 
  createTag, 
  getTags, 
  deleteTag, 
  addTagToDocument, 
  removeTagFromDocument 
} from '../controllers/tagController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use(requireAuth);

router.get('/', getTags);
router.post('/', createTag);
router.delete('/:id', deleteTag);
router.post('/documents/:id/tags', addTagToDocument);
router.delete('/documents/:id/tags/:tag_id', removeTagFromDocument);

export default router;
