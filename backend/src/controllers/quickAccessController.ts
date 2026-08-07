import { Request, Response } from 'express';
import * as quickAccessService from '../services/quickAccessService';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export async function addQuickAccess(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { document_id } = req.body;
  if (!document_id) throw ApiError.badRequest('ID du document manquant.');

  const result = await quickAccessService.addQuickAccess(userId, document_id);
  sendSuccess(res, result, 201);
}

export async function removeQuickAccess(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { document_id } = req.params;
  await quickAccessService.removeQuickAccess(userId, document_id);
  sendSuccess(res, { message: 'Document retiré des accès rapides.' });
}

export async function getQuickAccess(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const result = await quickAccessService.getQuickAccessList(userId);
  sendSuccess(res, result);
}

export async function reorderQuickAccess(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { document_ids } = req.body;
  if (!Array.isArray(document_ids)) throw ApiError.badRequest('Liste d\'identifiants invalide.');

  await quickAccessService.reorderQuickAccess(userId, document_ids);
  sendSuccess(res, { message: 'Ordre des accès rapides mis à jour.' });
}
