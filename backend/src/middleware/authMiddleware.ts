import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';

const prisma = new PrismaClient();

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Accès non autorisé. Jeton manquant.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { bannedAt: true, role: true },
    });

    if (!user) {
      return next(ApiError.unauthorized('Utilisateur introuvable.', 'USER_NOT_FOUND'));
    }

    if (user.bannedAt) {
      return next(ApiError.forbidden('Compte suspendu. Contactez le support.', 'ACCOUNT_BANNED'));
    }

    req.user = {
      ...payload,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.unauthorized('Jeton d\'accès invalide ou expiré.', 'INVALID_TOKEN'));
  }
}

/**
 * Authentification "douce" : accepte soit le header Authorization Bearer,
 * soit le jeton passé en query string (?token=...) pour les URLs utilisées
 * directement dans un <img>, un <iframe> ou window.open().
 */
export async function requireAuthOrToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string' && req.query.token.length > 0) {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { bannedAt: true, role: true },
    });

    if (user && !user.bannedAt) {
      req.user = {
        ...payload,
        role: user.role,
      };
    }
    next();
  } catch (_error) {
    return next(ApiError.unauthorized('Jeton d\'accès invalide ou expiré.', 'INVALID_TOKEN'));
  }
}
