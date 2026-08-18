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
import { 
  getAdminDevices, 
  blockDevice, 
  unblockDevice, 
  toggleUnlimitedDevice, 
  getMaxPerDeviceSetting, 
  updateMaxPerDeviceSetting 
} from '../controllers/adminDeviceController';

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

// GET & ACTIONS /api/v1/admin/devices
router.get('/devices', requireAuth, requireAdmin, getAdminDevices);
router.post('/devices/:id/block', requireAuth, requireAdmin, blockDevice);
router.post('/devices/:id/unblock', requireAuth, requireAdmin, unblockDevice);
router.post('/devices/:id/unlimited', requireAuth, requireAdmin, toggleUnlimitedDevice);

// SETTINGS /api/v1/admin/settings/max-per-device
router.get('/settings/max-per-device', requireAuth, requireAdmin, getMaxPerDeviceSetting);
router.put('/settings/max-per-device', requireAuth, requireAdmin, updateMaxPerDeviceSetting);

export default router;
