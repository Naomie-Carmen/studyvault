import { Request, Response } from 'express';
import * as tagService from '../services/tagService';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export async function createTag(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { name, color } = req.body;
  if (!name || typeof name !== 'string') throw ApiError.badRequest('Nom du tag obligatoire.');

  const tag = await tagService.createTag(userId, name.trim(), color);
  sendSuccess(res, tag, 201);
}

export async function getTags(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const tags = await tagService.getTags(userId);
  sendSuccess(res, tags);
}

export async function deleteTag(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { id } = req.params;
  await tagService.deleteTag(userId, id);
  sendSuccess(res, { message: 'Tag supprimé.' });
}

export async function addTagToDocument(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { id } = req.params; // document_id
  const { tag_id } = req.body;
  if (!tag_id) throw ApiError.badRequest('ID du tag obligatoire.');

  await tagService.addTagToDocument(userId, id, tag_id);
  sendSuccess(res, { message: 'Tag associé au document.' });
}

export async function removeTagFromDocument(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const { id, tag_id } = req.params;
  await tagService.removeTagFromDocument(id, tag_id);
  sendSuccess(res, { message: 'Tag retiré du document.' });
}
