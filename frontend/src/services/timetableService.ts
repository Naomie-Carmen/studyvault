import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { TimetableSession, TimetableImport, TimetableStats } from '../types/timetable';
import { TimetableSessionInput } from '../../../backend/src/utils/validators';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export async function createSession(
  data: TimetableSessionInput
): Promise<ApiResponse<TimetableSession>> {
  return fetchApi<TimetableSession>('/timetable/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSessions(filters?: {
  dayOfWeek?: number;
  subjectId?: string;
  sessionType?: string;
}): Promise<ApiResponse<TimetableSession[]>> {
  const query = new URLSearchParams();
  if (filters?.dayOfWeek !== undefined) query.append('dayOfWeek', String(filters.dayOfWeek));
  if (filters?.subjectId) query.append('subjectId', filters.subjectId);
  if (filters?.sessionType) query.append('sessionType', filters.sessionType);

  const queryString = query.toString();
  return fetchApi<TimetableSession[]>(`/timetable/sessions${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export async function getWeekSessions(): Promise<ApiResponse<Record<number, TimetableSession[]>>> {
  return fetchApi<Record<number, TimetableSession[]>>('/timetable/week', {
    method: 'GET',
  });
}

export async function getTodaySessions(): Promise<ApiResponse<TimetableSession[]>> {
  return fetchApi<TimetableSession[]>('/timetable/today', {
    method: 'GET',
  });
}

export async function getUpcomingSessions(): Promise<ApiResponse<TimetableSession[]>> {
  return fetchApi<TimetableSession[]>('/timetable/upcoming', {
    method: 'GET',
  });
}

export async function updateSession(
  id: string,
  data: Partial<TimetableSessionInput>
): Promise<ApiResponse<TimetableSession>> {
  return fetchApi<TimetableSession>(`/timetable/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/timetable/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function getTimetableStats(): Promise<ApiResponse<TimetableStats>> {
  return fetchApi<TimetableStats>('/timetable/stats', {
    method: 'GET',
  });
}

export async function uploadTimetableFile(
  file: File
): Promise<ApiResponse<TimetableImport>> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('studyvault_access_token');
  const response = await fetch(`${API_BASE_URL}/timetable/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return response.json();
}
