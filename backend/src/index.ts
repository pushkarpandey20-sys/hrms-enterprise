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
    logger.info('✅  PostgreSQL connected');

    // Redis
    await connectRedis();
    logger.info('✅  Redis connected');

    // HTTP + Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀  HRMS API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('❌  Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  process.exit(1);
});
