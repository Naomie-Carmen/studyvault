import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { 
  SearchQueryParams, 
  SearchResult, 
  FavoriteItem, 
  QuickAccessItem, 
  TagItem, 
  DashboardStats 
} from '../types/search';

export async function searchDocuments(
  params: SearchQueryParams
): Promise<ApiResponse<SearchResult>> {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.subjectId) query.append('subject_id', params.subjectId);
  if (params.ueId) query.append('ue_id', params.ueId);
  if (params.semesterId) query.append('semester_id', params.semesterId);
  if (params.docType) query.append('doc_type', params.docType);
  if (params.dateFrom) query.append('date_from', params.dateFrom);
  if (params.dateTo) query.append('date_to', params.dateTo);
  if (params.isFavorite) query.append('is_favorite', 'true');
  if (params.personalFolderId) query.append('personal_folder_id', params.personalFolderId);
  if (params.tagId) query.append('tag_id', params.tagId);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.sort) query.append('sort', params.sort);

  const queryString = query.toString();
  return fetchApi<SearchResult>(`/search${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export async function getFavorites(): Promise<ApiResponse<FavoriteItem[]>> {
  return fetchApi<FavoriteItem[]>('/favorites', { method: 'GET' });
}

export async function addFavorite(documentId: string): Promise<ApiResponse<FavoriteItem>> {
  return fetchApi<FavoriteItem>(`/favorites/${documentId}`, { method: 'POST' });
}

export async function removeFavorite(documentId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/favorites/${documentId}`, { method: 'DELETE' });
}

export async function getQuickAccess(): Promise<ApiResponse<QuickAccessItem[]>> {
  return fetchApi<QuickAccessItem[]>('/quick-access', { method: 'GET' });
}

export async function addQuickAccess(documentId: string): Promise<ApiResponse<QuickAccessItem>> {
  return fetchApi<QuickAccessItem>('/quick-access', {
    method: 'POST',
    body: JSON.stringify({ document_id: documentId }),
  });
}

export async function removeQuickAccess(documentId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/quick-access/${documentId}`, { method: 'DELETE' });
}

export async function reorderQuickAccess(documentIds: string[]): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/quick-access/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ document_ids: documentIds }),
  });
}

export async function getTags(): Promise<ApiResponse<TagItem[]>> {
  return fetchApi<TagItem[]>('/tags', { method: 'GET' });
}

export async function createTag(name: string, color?: string): Promise<ApiResponse<TagItem>> {
  return fetchApi<TagItem>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function deleteTag(tagId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/tags/${tagId}`, { method: 'DELETE' });
}

export async function addTagToDocument(
  documentId: string,
  tagId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/tags/documents/${documentId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagId }),
  });
}

export async function removeTagFromDocument(
  documentId: string,
  tagId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/tags/documents/${documentId}/tags/${tagId}`, {
    method: 'DELETE',
  });
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return fetchApi<DashboardStats>('/dashboard/stats', { method: 'GET' });
}
