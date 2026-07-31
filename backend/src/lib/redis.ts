import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://default:ABj9rOSPOiJQcYBxVvwP23irh9vb4mmM@redis-13454.crce182.ap-south-1-1.ec2.cloud.redislabs.com:13454';

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  family: 4,
  connectTimeout: 10000,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('connect', () => {
  console.log(`ioredis connected successfully`);
});

redisClient.on('error', err => {
  if ((err as any).code === 'ECONNREFUSED') {
    console.warn(`⚠️ ioredis connection refused. Ensure Redis URL is correct.`);
  } else {
    console.error(`❌ ioredis error:`, err.message);
  }
});

export default redisClient;
