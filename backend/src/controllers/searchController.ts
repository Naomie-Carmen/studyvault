import { Request, Response } from 'express';
import { searchDocuments } from '../services/searchService';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { SearchQueryParams } from '../types/search';

export async function search(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Utilisateur non identifié.');

  const {
    q,
    subject_id,
    ue_id,
    semester_id,
    doc_type,
    date_from,
    date_to,
    is_favorite,
    personal_folder_id,
    tag_id,
    page,
    limit,
    sort,
  } = req.query;

  const result = await searchDocuments(userId, {
    q: q ? String(q) : undefined,
    subjectId: subject_id ? String(subject_id) : undefined,
    ueId: ue_id ? String(ue_id) : undefined,
    semesterId: semester_id ? String(semester_id) : undefined,
    docType: doc_type ? String(doc_type) : undefined,
    dateFrom: date_from ? String(date_from) : undefined,
    dateTo: date_to ? String(date_to) : undefined,
    isFavorite: is_favorite === 'true',
    personalFolderId: personal_folder_id ? String(personal_folder_id) : undefined,
    tagId: tag_id ? String(tag_id) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    sort: sort ? (String(sort) as SearchQueryParams['sort']) : undefined,
  });

  sendSuccess(res, result);
}
