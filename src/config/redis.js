const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      // Redis configuration
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error('Redis max retries reached, giving up');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        }
      };

      // Add password if configured
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      // Add TLS if configured (for production)
      if (process.env.REDIS_TLS === 'true') {
        redisConfig.socket.tls = true;
      }

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
        this.retryAttempts++;
      });

      this.client.on('end', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      logger.info('Redis connected successfully');
      return this.client;

    } catch (error) {
      logger.error('Redis connection error:', error);
      this.isConnected = false;
      // Don't throw - allow app to run without Redis
      return null;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client;
  }

  // Cache operations with error handling
  async get(key) {
    if (!this.isReady()) return null;
    
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isReady()) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isReady()) return [];
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushPattern(pattern) {
    if (!this.isReady()) return false;
    
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Flushed ${keys.length} keys matching pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Redis flush pattern error for ${pattern}:`, error);
      return false;
    }
  }

  async increment(key, amount = 1) {
    if (!this.isReady()) return null;
    
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`Redis INCREMENT error for key ${key}:`, error);
      return null;
    }
  }

  async decrement(key, amount = 1) {
    if (!this.isReady()) return null;
    
    try {
      return await this.client.decrBy(key, amount);
    } catch (error) {
      logger.error(`Redis DECREMENT error for key ${key}:`, error);
      return null;
    }
  }

  // Hash operations
  async hSet(key, field, value) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}:`, error);
      return false;
    }
  }

  async hGet(key, field) {
    if (!this.isReady()) return null;
    
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}:`, error);
      return null;
    }
  }

  async hGetAll(key) {
    if (!this.isReady()) return null;
    
    try {
      const data = await this.client.hGetAll(key);
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  // List operations
  async lPush(key, value) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.lPush(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:`, error);
      return false;
    }
  }

  async lRange(key, start = 0, stop = -1) {
    if (!this.isReady()) return [];
    
    try {
      const values = await this.client.lRange(key, start, stop);
      return values.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.isReady()) {
      return {
        connected: false,
        error: 'Redis not connected'
      };
    }
    
    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();
      
      return {
        connected: true,
        dbSize,
        info: info
      };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return {
        connected: this.isConnected,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
