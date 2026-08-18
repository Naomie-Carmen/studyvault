import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { getMaxAccountsPerDevice, setMaxAccountsPerDevice } from '../services/authService';

const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/devices
 * List all registered devices with associated user emails and statuses.
 */
export async function getAdminDevices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [devices, maxPerDevice] = await Promise.all([
      prisma.device.findMany({
        include: {
          users: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { lastSeen: 'desc' },
      }),
      getMaxAccountsPerDevice(),
    ]);

    const formatted = devices.map((d) => ({
      id: d.id,
      label: d.label || (d.id.startsWith('DESKTOP-') ? 'Application Desktop' : 'Navigateur Web'),
      blocked: d.blocked,
      unlimited: d.unlimited,
      firstSeen: d.firstSeen,
      lastSeen: d.lastSeen,
      accountCount: d.users.length,
      userEmails: d.users.map((u) => u.email),
      users: d.users,
    }));

    sendSuccess(res, {
      devices: formatted,
      maxAccountsPerDevice: maxPerDevice,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/devices/:id/block
 * Block a device from registering or logging in.
 */
export async function blockDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deviceId = req.params.id;
    const adminId = req.user?.id || 'unknown';

    const device = await prisma.device.upsert({
      where: { id: deviceId },
      create: { id: deviceId, blocked: true },
      update: { blocked: true },
    });

    console.log(`[ADMIN] User ${adminId} blocked device ${deviceId}`);

    sendSuccess(res, {
      message: `L'appareil ${deviceId} a été bloqué avec succès.`,
      device,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/devices/:id/unblock
 * Unblock a previously blocked device.
 */
export async function unblockDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deviceId = req.params.id;
    const adminId = req.user?.id || 'unknown';

    const device = await prisma.device.update({
      where: { id: deviceId },
      data: { blocked: false },
    });

    console.log(`[ADMIN] User ${adminId} unblocked device ${deviceId}`);

    sendSuccess(res, {
      message: `L'appareil ${deviceId} a été débloqué.`,
      device,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/devices/:id/unlimited
 * Toggle unlimited status for a specific device.
 */
export async function toggleUnlimitedDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deviceId = req.params.id;
    const { unlimited } = req.body;

    const targetDevice = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!targetDevice) {
      throw ApiError.notFound('Appareil introuvable.');
    }

    const newStatus = typeof unlimited === 'boolean' ? unlimited : !targetDevice.unlimited;

    const device = await prisma.device.update({
      where: { id: deviceId },
      data: { unlimited: newStatus },
    });

    sendSuccess(res, {
      message: `Le mode illimité pour l'appareil ${deviceId} est maintenant ${newStatus ? 'ACTIF' : 'INACTIF'}.`,
      device,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/settings/max-per-device
 */
export async function getMaxPerDeviceSetting(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const max = await getMaxAccountsPerDevice();
    sendSuccess(res, { maxAccountsPerDevice: max });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/admin/settings/max-per-device
 * Update maximum allowed accounts per device globally (between 1 and 10).
 */
export async function updateMaxPerDeviceSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { max } = req.body;
    const num = parseInt(max, 10);
    if (isNaN(num) || num < 1 || num > 10) {
      throw ApiError.badRequest('La limite de comptes par appareil doit être comprise entre 1 et 10.');
    }

    const updatedMax = await setMaxAccountsPerDevice(num);
    sendSuccess(res, {
      message: `La limite globale de comptes par appareil a été mise à jour à ${updatedMax}.`,
      maxAccountsPerDevice: updatedMax,
    });
  } catch (error) {
    next(error);
  }
}
