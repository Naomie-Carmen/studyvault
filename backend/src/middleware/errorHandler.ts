import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { sendError } from '../utils/apiResponse';
import { env } from '../config/env';

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle uncaught errors
  console.error('[UNHANDLED ERROR]', err);

  const message = env.IS_DEV ? err.message : 'Une erreur interne du serveur est survenue.';
  const details = env.IS_DEV ? { stack: err.stack } : undefined;

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
}
