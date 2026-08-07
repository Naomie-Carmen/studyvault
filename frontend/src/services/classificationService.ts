import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { ClassificationSuggestion } from '../types/classification';
import { DocumentItem } from '../types/document';

export async function getClassification(
  documentId: string
): Promise<ApiResponse<ClassificationSuggestion>> {
  return fetchApi<ClassificationSuggestion>(`/documents/${documentId}/classification`, {
    method: 'GET',
  });
}

export async function acceptClassification(
  documentId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/documents/${documentId}/classification/accept`, {
    method: 'POST',
  });
}

export async function modifyClassification(
  documentId: string,
  subjectId: string,
  docType: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/documents/${documentId}/classification/modify`, {
    method: 'POST',
    body: JSON.stringify({ subjectId, docType }),
  });
}

export async function rejectClassification(
  documentId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/documents/${documentId}/classification/reject`, {
    method: 'POST',
  });
}

export async function getUnclassifiedDocuments(): Promise<ApiResponse<DocumentItem[]>> {
  return fetchApi<DocumentItem[]>('/documents/unclassified', {
    method: 'GET',
  });
}
