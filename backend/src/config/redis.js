import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4, // Force IPv4
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

export async function connectRedis() {
  try {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('connect', () => {
      logger.info('🟢 Redis connecting...');
    });
    
    redisClient.on('ready', () => {
      logger.info('✅ Redis connection ready');
    });
    
    redisClient.on('error', (error) => {
      logger.error('❌ Redis connection error:', error.message);
    });
    
    redisClient.on('close', () => {
      logger.warn('🔴 Redis connection closed');
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(`🔄 Redis reconnecting in ${delay}ms`);
    });
    
    redisClient.on('end', () => {
      logger.info('🔌 Redis connection ended');
    });
    
    // Connect to Redis
    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('📡 Redis connection verified');
    
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('🔌 Redis disconnected gracefully');
    } catch (error) {
      logger.error('❌ Redis disconnection failed:', error);
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}

// Redis utility functions
export class RedisService {
  static async get(key) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }
  
  static async set(key, value, ttl = null) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      if (ttl) {
        return await redisClient.setex(key, ttl, value);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }
  
  static async del(key) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
  
  static async exists(key) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
  
  static async incr(key, ttl = null) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      const value = await redisClient.incr(key);
      if (ttl && value === 1) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }
  
  static async hget(hash, field) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.hget(hash, field);
    } catch (error) {
      logger.error(`Redis HGET error for ${hash}.${field}:`, error);
      return null;
    }
  }
  
  static async hset(hash, field, value) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.hset(hash, field, value);
    } catch (error) {
      logger.error(`Redis HSET error for ${hash}.${field}:`, error);
      return false;
    }
  }
  
  static async hgetall(hash) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.hgetall(hash);
    } catch (error) {
      logger.error(`Redis HGETALL error for ${hash}:`, error);
      return {};
    }
  }
  
  static async lpush(list, ...values) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.lpush(list, ...values);
    } catch (error) {
      logger.error(`Redis LPUSH error for ${list}:`, error);
      return 0;
    }
  }
  
  static async rpop(list) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.rpop(list);
    } catch (error) {
      logger.error(`Redis RPOP error for ${list}:`, error);
      return null;
    }
  }
  
  static async lrange(list, start, stop) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      return await redisClient.lrange(list, start, stop);
    } catch (error) {
      logger.error(`Redis LRANGE error for ${list}:`, error);
      return [];
    }
  }
}

// Cache helper for common patterns
export class CacheManager {
  static async cacheData(key, data, ttl = 300) {
    const serialized = JSON.stringify(data);
    return await RedisService.set(key, serialized, ttl);
  }
  
  static async getCachedData(key) {
    const cached = await RedisService.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        logger.error(`Failed to parse cached data for key ${key}:`, error);
        return null;
      }
    }
    return null;
  }
  
  static async invalidateCache(pattern) {
    try {
      if (!redisClient) throw new Error('Redis client not initialized');
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        return await redisClient.del(...keys);
      }
      return 0;
    } catch (error) {
      logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});

export { redisClient };