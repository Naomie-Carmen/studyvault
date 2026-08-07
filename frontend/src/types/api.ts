export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export interface ModuleStatus {
  name: string;
  status: 'ready' | 'pending';
}

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  database: 'connected' | 'disconnected' | 'not_configured';
  modules: ModuleStatus[];
}
