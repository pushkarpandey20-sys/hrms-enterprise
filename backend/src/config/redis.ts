import Redis from 'ioredis';
import { logger } from '../shared/utils/logger';

export let redis: Redis;

export async function connectRedis(): Promise<void> {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => logger.error('Redis error:', err));
  redis.on('connect', () => logger.info('Redis connected'));

  await redis.ping();
}

export default redis;
