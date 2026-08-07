import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';

export interface UserConsent {
  analyticsOptIn: boolean;
  contentAnalysisOptIn: boolean;
  transactionalEmails: boolean;
}

export async function getUserConsent(): Promise<ApiResponse<UserConsent>> {
  return fetchApi<UserConsent>('/rgpd/consent', { method: 'GET' });
}

export async function updateUserConsent(
  analyticsOptIn: boolean,
  contentAnalysisOptIn: boolean
): Promise<ApiResponse<UserConsent>> {
  return fetchApi<UserConsent>('/rgpd/consent', {
    method: 'POST',
    body: JSON.stringify({ analyticsOptIn, contentAnalysisOptIn }),
  });
}

export async function deleteAccount(): Promise<ApiResponse<{ message: string; purgeScheduledAt: string }>> {
  return fetchApi<{ message: string; purgeScheduledAt: string }>('/rgpd/delete-account', {
    method: 'POST',
  });
}

export async function downloadDataExport(): Promise<void> {
  const token = localStorage.getItem('studyvault_access_token');
  const res = await fetch('/api/v1/rgpd/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Échec du téléchargement de l\'export RGPD.');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studyvault-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
