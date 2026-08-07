import { Router } from 'express';
import { addFavorite, removeFavorite, getFavorites } from '../controllers/favoriteController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use(requireAuth);

router.get('/', getFavorites);
router.post('/:document_id', addFavorite);
router.delete('/:document_id', removeFavorite);

export default router;
