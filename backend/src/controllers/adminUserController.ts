import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/users
 * Returns list of active & banned users with pagination & search.
 */
export async function getAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || 'all').toLowerCase(); // all, active, banned

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.bannedAt = null;
    } else if (status === 'banned') {
      where.bannedAt = { not: null };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          university: true,
          program: true,
          level: true,
          role: true,
          bannedAt: true,
          lastLogin: true,
          createdAt: true,
          devices: {
            select: { id: true, label: true, blocked: true },
            take: 1,
            orderBy: { lastSeen: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    sendSuccess(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/users/archived
 * Returns list of deleted accounts from UserArchive.
 */
export async function getArchivedUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const archives = await prisma.userArchive.findMany({
      orderBy: { deletedAt: 'desc' },
    });
    sendSuccess(res, archives);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/users/:id/ban
 * Bans a user immediately by setting bannedAt = now and revoking refresh tokens.
 */
export async function banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = req.params.id;
    const adminId = req.user?.id || 'unknown';

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw ApiError.notFound('Utilisateur introuvable.');
    }

    if (user.role === 'admin') {
      throw ApiError.badRequest('Impossible de bannir un compte administrateur.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { bannedAt: new Date() },
      select: { id: true, email: true, bannedAt: true },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: targetId },
    });

    console.log(`[ADMIN] User ${adminId} banned user ${targetId} (${user.email})`);

    sendSuccess(res, {
      message: `L'utilisateur ${user.email} a été banni avec succès.`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/users/:id/unban
 * Unbans a user by resetting bannedAt = null.
 */
export async function unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = req.params.id;
    const adminId = req.user?.id || 'unknown';

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw ApiError.notFound('Utilisateur introuvable.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { bannedAt: null },
      select: { id: true, email: true, bannedAt: true },
    });

    console.log(`[ADMIN] User ${adminId} unbanned user ${targetId} (${user.email})`);

    sendSuccess(res, {
      message: `L'utilisateur ${user.email} a été réactivé.`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/admin/users/:id
 * Permanently deletes a user and stores an archive record in UserArchive.
 */
export async function deleteUserAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = req.params.id;
    const adminId = req.user?.id || 'unknown';

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw ApiError.notFound('Utilisateur introuvable.');
    }

    if (user.role === 'admin') {
      throw ApiError.badRequest('Impossible de supprimer un compte administrateur.');
    }

    // Create archive record
    await prisma.userArchive.create({
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
        reason: (req.body?.reason as string) || 'Suppression par administrateur',
      },
    });

    // Delete user (cascades related records)
    await prisma.user.delete({
      where: { id: targetId },
    });

    console.log(`[ADMIN] User ${adminId} deleted user ${targetId} (${user.email})`);

    sendSuccess(res, { message: `Le compte ${user.email} a été supprimé et archivé.` });
  } catch (error) {
    next(error);
  }
}
