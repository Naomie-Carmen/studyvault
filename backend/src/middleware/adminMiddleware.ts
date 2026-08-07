import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware ensuring the authenticated user has role === 'admin'.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { message: 'Authentification requise.' } });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, error: { message: 'Accès réservé aux administrateurs.' } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur d\'autorisation administrateur.' } });
  }
}
