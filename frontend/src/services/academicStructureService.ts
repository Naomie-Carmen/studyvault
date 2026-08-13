import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { AcademicStructureTree, UE, ECUE, Subject, StructureImportItem, StructureImportSummary } from '../types/structure';
import { UEInput, ECUEInput, SubjectInput } from '../types/validators';

export async function getStructureTree(): Promise<ApiResponse<AcademicStructureTree>> {
  return fetchApi<AcademicStructureTree>('/academic-structure', {
    method: 'GET',
  });
}

export async function importStructureBatch(payload: { items: StructureImportItem[] }): Promise<ApiResponse<StructureImportSummary>> {
  return fetchApi<StructureImportSummary>('/academic-structure/import-batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


// UE API calls
export async function createUE(data: UEInput): Promise<ApiResponse<UE>> {
  return fetchApi<UE>('/academic-structure/ue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUE(id: string, data: Partial<UEInput>): Promise<ApiResponse<UE>> {
  return fetchApi<UE>(`/academic-structure/ue/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUE(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/academic-structure/ue/${id}`, {
    method: 'DELETE',
  });
}

// ECUE API calls
export async function createECUE(data: ECUEInput): Promise<ApiResponse<ECUE>> {
  return fetchApi<ECUE>('/academic-structure/ecue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateECUE(id: string, data: Partial<ECUEInput>): Promise<ApiResponse<ECUE>> {
  return fetchApi<ECUE>(`/academic-structure/ecue/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteECUE(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/academic-structure/ecue/${id}`, {
    method: 'DELETE',
  });
}

// Subject API calls
export async function createSubject(data: SubjectInput): Promise<ApiResponse<Subject>> {
  return fetchApi<Subject>('/academic-structure/subject', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubject(id: string, data: Partial<SubjectInput>): Promise<ApiResponse<Subject>> {
  return fetchApi<Subject>(`/academic-structure/subject/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSubject(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/academic-structure/subject/${id}`, {
    method: 'DELETE',
  });
}
