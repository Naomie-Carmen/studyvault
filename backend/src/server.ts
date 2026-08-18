import app from './app';
import { env } from './config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureDefaultAdmin() {
  try {
    const naomieUser = await prisma.user.findFirst({
      where: { email: { contains: 'naomie', mode: 'insensitive' } },
    });

    if (naomieUser) {
      if (naomieUser.role !== 'admin') {
        await prisma.user.update({
          where: { id: naomieUser.id },
          data: { role: 'admin' },
        });
        console.info(`[ADMIN SEED] User ${naomieUser.email} granted admin role.`);
      }
    } else {
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (firstUser && firstUser.role !== 'admin') {
        await prisma.user.update({
          where: { id: firstUser.id },
          data: { role: 'admin' },
        });
        console.info(`[ADMIN SEED] Earliest user ${firstUser.email} granted admin role.`);
      }
    }
  } catch (err) {
    console.error('[ADMIN SEED] Error ensuring default admin:', err);
  }
}

ensureDefaultAdmin();

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

