import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as authService from '../services/authService';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Utilisateur non authentifié.');
    }

    const userProfile = await authService.getUserProfile(req.user.id);
    sendSuccess(res, userProfile, 200);
  } catch (error) {
    next(error);
  }
}
