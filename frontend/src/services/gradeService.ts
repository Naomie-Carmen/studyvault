import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';

export interface NoteTypeConfig {
  id?: string;
  name: string;
  weight: number;
}

export interface GradeConfigResponse {
  defaultTypes: NoteTypeConfig[];
  customTypes: {
    id: string;
    ecueId: string;
    name: string;
    weight: number;
    ecue?: {
      id: string;
      code: string | null;
      title: string;
    };
  }[];
}

export interface NoteItemDetail {
  noteTypeId: string;
  noteTypeName: string;
  weight: number;
  value: number | null;
}

export interface EcueGradeSummary {
  ecueId: string;
  code: string | null;
  title: string;
  average: number | null;
  notes: NoteItemDetail[];
}

export interface UeGradeSummary {
  ueId: string;
  code: string | null;
  title: string;
  ects: number | null;
  average: number | null;
  ecues: EcueGradeSummary[];
}

export interface SemesterGradeSummary {
  semesterId: string;
  semesterNumber: number;
  semesterLabel: string;
  average: number | null;
  credits: number;
  ues: UeGradeSummary[];
}

export interface GradeAveragesResponse {
  annualAverage: number | null;
  totalValidatedCredits: number;
  totalCredits: number;
  semesters: SemesterGradeSummary[];
}

export async function getGradeConfig(): Promise<ApiResponse<GradeConfigResponse>> {
  return fetchApi<GradeConfigResponse>('/grades/config', {
    method: 'GET',
  });
}

export async function updateGradeConfig(
  ecueId: string | null,
  types: NoteTypeConfig[]
): Promise<ApiResponse<NoteTypeConfig[]>> {
  return fetchApi<NoteTypeConfig[]>('/grades/config', {
    method: 'POST',
    body: JSON.stringify({ ecueId, types }),
  });
}

export async function saveGrades(
  ecueId: string,
  notes: { noteTypeId: string; value: number | null }[]
): Promise<ApiResponse<any>> {
  return fetchApi<any>('/grades', {
    method: 'POST',
    body: JSON.stringify({ ecueId, notes }),
  });
}

export async function getAverages(): Promise<ApiResponse<GradeAveragesResponse>> {
  return fetchApi<GradeAveragesResponse>('/grades/averages', {
    method: 'GET',
  });
}
