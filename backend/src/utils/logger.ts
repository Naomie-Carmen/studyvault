/* eslint-disable no-console */
export interface LogContext {
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      service: 'studyvault-backend',
      message,
      ...context,
    }));
  },
  error(message: string, context?: LogContext): void {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'studyvault-backend',
      message,
      ...context,
    }));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      service: 'studyvault-backend',
      message,
      ...context,
    }));
  },
};
