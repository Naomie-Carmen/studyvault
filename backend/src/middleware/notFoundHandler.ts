import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`La route [${req.method}] ${req.originalUrl} n'existe pas.`));
}
