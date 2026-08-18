import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { getAdminMetrics } from '../controllers/adminDashboardController';
import { 
  getAdminUsers, 
  getArchivedUsers, 
  banUser, 
  unbanUser, 
  deleteUserAdmin 
} from '../controllers/adminUserController';

const router = Router();

// GET /api/v1/admin/dashboard (admin only)
router.get('/dashboard', requireAuth, requireAdmin, getAdminMetrics);

// GET /api/v1/admin/users
router.get('/users', requireAuth, requireAdmin, getAdminUsers);

// GET /api/v1/admin/users/archived
router.get('/users/archived', requireAuth, requireAdmin, getArchivedUsers);

// POST /api/v1/admin/users/:id/ban
router.post('/users/:id/ban', requireAuth, requireAdmin, banUser);

// POST /api/v1/admin/users/:id/unban
router.post('/users/:id/unban', requireAuth, requireAdmin, unbanUser);

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, deleteUserAdmin);

export default router;
