import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.info(`==================================================`);
  console.info(`🚀 StudyVault Backend API Status: ONLINE`);
  console.info(`📡 Listening on: http://localhost:${env.PORT}`);
  console.info(`🟢 Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  console.info(`⚙️  Environment: ${env.NODE_ENV}`);
  console.info(`==================================================`);
});

// Graceful Shutdown Handling
const shutdown = (signal: string) => {
  console.info(`\n[SHUTDOWN] Received signal ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.info('[SHUTDOWN] HTTP server closed. Process exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
