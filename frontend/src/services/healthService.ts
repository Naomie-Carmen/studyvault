import { fetchApi } from './apiClient.js';
import { ApiResponse, HealthCheckData } from '../types/api.js';

export async function getHealthCheck(): Promise<ApiResponse<HealthCheckData>> {
  return fetchApi<HealthCheckData>('/health');
}
