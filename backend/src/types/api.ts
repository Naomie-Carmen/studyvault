export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: Record<string, unknown>;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  database: 'connected' | 'disconnected' | 'not_configured';
  modules: {
    name: string;
    status: 'ready' | 'pending';
  }[];
}
