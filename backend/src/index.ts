import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './sockets/socketServer';
import { logger } from './shared/utils/logger';
import { connectRedis } from './config/redis';
import { prisma } from './config/database';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('\u2705  PostgreSQL connected');

    // Redis (optional \u2014 background jobs won't work without it)
    try {
      await connectRedis();
      logger.info('\u2705  Redis connected');
    } catch (redisErr) {
      logger.warn('\u26a0\ufe0f  Redis not available, continuing without it:', redisErr);
    }

    // HTTP + Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`\ud83d\ude80  HRMS API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('\u274c  Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection (non-fatal, server kept alive):', err);
  // Do NOT exit \u2014 keep the server running
});
