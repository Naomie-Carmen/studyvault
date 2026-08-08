import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { AcademicProfile, Semester } from '../types/academic';
import { AcademicProfileInput } from '../types/validators';

export async function getProfile(): Promise<ApiResponse<AcademicProfile>> {
  return fetchApi<AcademicProfile>('/academic-profile', {
    method: 'GET',
  });
}

export async function updateProfile(data: AcademicProfileInput): Promise<ApiResponse<AcademicProfile>> {
  return fetchApi<AcademicProfile>('/academic-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getUniversities(): Promise<ApiResponse<string[]>> {
  return fetchApi<string[]>('/academic-profile/universities', {
    method: 'GET',
  });
}

export async function patchSemester(semesterId: string, isActive: boolean): Promise<ApiResponse<Semester>> {
  return fetchApi<Semester>(`/academic-profile/semesters/${semesterId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}
