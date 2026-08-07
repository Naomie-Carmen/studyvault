import { Request, Response } from 'express';
import { getDashboardStats } from '../services/dashboardService';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export async function getStats(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const stats = await getDashboardStats(userId);
  sendSuccess(res, stats);
}
