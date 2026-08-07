import { Request, Response } from 'express';
import * as favoriteService from '../services/favoriteService';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export async function addFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { document_id } = req.params;
  const result = await favoriteService.addFavorite(userId, document_id);
  sendSuccess(res, result, 201);
}

export async function removeFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { document_id } = req.params;
  await favoriteService.removeFavorite(userId, document_id);
  sendSuccess(res, { message: 'Document retiré des favoris.' });
}

export async function getFavorites(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const result = await favoriteService.getFavorites(userId);
  sendSuccess(res, result);
}
