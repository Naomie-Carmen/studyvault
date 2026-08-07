import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { TimetableSuggestionItem, SuggestionStats } from '../types/ocr';

export async function processImport(
  importId: string
): Promise<ApiResponse<{ status: string; count: number }>> {
  return fetchApi<{ status: string; count: number }>(`/timetable/imports/${importId}/process`, {
    method: 'POST',
  });
}

export async function getSuggestions(
  importId: string
): Promise<ApiResponse<{ suggestions: TimetableSuggestionItem[]; stats: SuggestionStats }>> {
  return fetchApi<{ suggestions: TimetableSuggestionItem[]; stats: SuggestionStats }>(
    `/timetable/imports/${importId}/suggestions`,
    {
      method: 'GET',
    }
  );
}

export async function validateSuggestions(
  importId: string,
  selectedSuggestionIds: string[],
  corrections?: { suggestionId: string; subjectId?: string; dayOfWeek?: number; startTime?: string; endTime?: string; room?: string; sessionType?: string }[]
): Promise<ApiResponse<{ createdCount: number }>> {
  return fetchApi<{ createdCount: number }>(`/timetable/imports/${importId}/validate`, {
    method: 'POST',
    body: JSON.stringify({ selectedSuggestionIds, corrections }),
  });
}

export async function rejectSuggestions(
  importId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/timetable/imports/${importId}/reject`, {
    method: 'POST',
  });
}
