import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { DocumentItem } from '../types/document';
import { DocumentMetadata } from '../types/viewer';

export async function recordDocumentView(
  documentId: string,
  durationSeconds: number = 0
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/documents/${documentId}/views`, {
    method: 'POST',
    body: JSON.stringify({ durationSeconds }),
  });
}

export async function getRecentlyViewed(): Promise<ApiResponse<DocumentItem[]>> {
  return fetchApi<DocumentItem[]>('/documents/recently-viewed', {
    method: 'GET',
  });
}

export async function getDocumentMetadata(
  documentId: string
): Promise<ApiResponse<DocumentMetadata>> {
  return fetchApi<DocumentMetadata>(`/documents/${documentId}/metadata`, {
    method: 'GET',
  });
}
