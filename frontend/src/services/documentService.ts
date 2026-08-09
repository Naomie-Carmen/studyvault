import { fetchApi, API_BASE_URL, getClientAccessToken } from './apiClient';
import { ApiResponse } from '../types/api';
import { DocumentItem, PersonalFolderItem, UserQuota } from '../types/document';
import { DocumentUpdateInput, PersonalFolderInput } from '../types/validators';

export async function uploadFiles(
  formData: FormData
): Promise<ApiResponse<DocumentItem[]>> {
  const token = getClientAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Impossible de contacter l\'API backend.',
        statusCode: 503,
      },
    };
  }
}

export async function getDocuments(filters?: {
  subjectId?: string;
  personalFolderId?: string;
  docType?: string;
  search?: string;
  isPersonalVault?: boolean;
}): Promise<ApiResponse<DocumentItem[]>> {
  const params = new URLSearchParams();
  if (filters?.subjectId) params.append('subjectId', filters.subjectId);
  if (filters?.personalFolderId) params.append('personalFolderId', filters.personalFolderId);
  if (filters?.docType) params.append('docType', filters.docType);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.isPersonalVault) params.append('isPersonalVault', 'true');

  const queryString = params.toString();
  return fetchApi<DocumentItem[]>(`/documents${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export function getPreviewUrl(documentId: string): string {
  const token = getClientAccessToken();
  return `${API_BASE_URL}/documents/${documentId}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export async function updateDocument(
  id: string,
  data: DocumentUpdateInput
): Promise<ApiResponse<DocumentItem>> {
  return fetchApi<DocumentItem>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function softDeleteDocument(id: string): Promise<ApiResponse<DocumentItem>> {
  return fetchApi<DocumentItem>(`/documents/${id}`, {
    method: 'DELETE',
  });
}

export async function restoreDocument(id: string): Promise<ApiResponse<DocumentItem>> {
  return fetchApi<DocumentItem>(`/documents/${id}/restore`, {
    method: 'POST',
  });
}

export async function getTrash(): Promise<ApiResponse<DocumentItem[]>> {
  return fetchApi<DocumentItem[]>('/documents/trash', {
    method: 'GET',
  });
}

export async function permanentlyDeleteDocument(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/documents/trash/${id}`, {
    method: 'DELETE',
  });
}

export async function emptyTrash(): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/documents/trash/empty', {
    method: 'POST',
  });
}

export async function getQuota(): Promise<ApiResponse<UserQuota>> {
  return fetchApi<UserQuota>('/documents/quota', {
    method: 'GET',
  });
}

export async function getPersonalFolders(): Promise<ApiResponse<PersonalFolderItem[]>> {
  return fetchApi<PersonalFolderItem[]>('/personal-folders', {
    method: 'GET',
  });
}

export async function createPersonalFolder(
  data: PersonalFolderInput
): Promise<ApiResponse<PersonalFolderItem>> {
  return fetchApi<PersonalFolderItem>('/personal-folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deletePersonalFolder(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/personal-folders/${id}`, {
    method: 'DELETE',
  });
}
