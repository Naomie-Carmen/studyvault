import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Accès non autorisé. Jeton manquant.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (_error) {
    return next(ApiError.unauthorized('Jeton d\'accès invalide ou expiré.', 'INVALID_TOKEN'));
  }
}

/**
 * Authentification "douce" : accepte soit le header Authorization Bearer,
 * soit le jeton passé en query string (?token=...) pour les URLs utilisées
 * directement dans un <img>, un <iframe> ou window.open() (prévisualisation
 * et téléchargement de fichiers). Sans jeton valide, la requête continue et
 * c'est au contrôleur de refuser l'accès (401).
 */
export function requireAuthOrToken(req: Request, _res: Response, next: NextFunction): void {
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
    req.user = payload;
    next();
  } catch (_error) {
    return next(ApiError.unauthorized('Jeton d\'accès invalide ou expiré.', 'INVALID_TOKEN'));
  }
}
