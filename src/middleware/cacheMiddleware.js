const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache middleware for Express routes
 * Caches GET requests based on URL and query parameters
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key from URL and query params
      const cacheKey = `api:${req.originalUrl || req.url}`;
      
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return res.json({
          ...cachedData,
          cached: true,
          cachedAt: new Date().toISOString()
        });
      }

      // Cache miss - store original res.json
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Cache the response
        cacheService.set(cacheKey, data, ttl).catch(err => {
          logger.error('Cache set error in middleware:', err);
        });
        
        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Conditional cache middleware
 * Only caches if condition function returns true
 */
const conditionalCache = (condition, ttl = 300) => {
  return async (req, res, next) => {
    if (!condition(req)) {
      return next();
    }
    return cacheMiddleware(ttl)(req, res, next);
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache patterns on POST, PUT, PATCH, DELETE requests
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Wrap response methods to invalidate cache after successful response
    const invalidatePatterns = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
          
          for (const pattern of patternsArray) {
            const resolvedPattern = typeof pattern === 'function' ? pattern(req) : pattern;
            await cacheService.delete(resolvedPattern);
            logger.debug(`Cache invalidated: ${resolvedPattern}`);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }
    };

    res.json = (data) => {
      invalidatePatterns();
      return originalJson(data);
    };

    res.send = (data) => {
      invalidatePatterns();
      return originalSend(data);
    };

    next();
  };
};

/**
 * User-specific cache middleware
 * Caches data per user
 */
const userCache = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.user) {
      return next();
    }

    try {
      const cacheKey = `user:${req.user.id}:${req.originalUrl || req.url}`;
      
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`User cache hit for ${cacheKey}`);
        return res.json({
          ...cachedData,
          cached: true
        });
      }

      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        cacheService.set(cacheKey, data, ttl).catch(err => {
          logger.error('User cache set error:', err);
        });
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('User cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache warming helper
 * Pre-populate cache with data
 */
const warmCache = async (key, fetchFunction, ttl = 300) => {
  try {
    const data = await fetchFunction();
    await cacheService.set(key, data, ttl);
    logger.info(`Cache warmed for key: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Cache warming error for key ${key}:`, error);
    return false;
  }
};

module.exports = {
  cacheMiddleware,
  conditionalCache,
  invalidateCache,
  userCache,
  warmCache
};
