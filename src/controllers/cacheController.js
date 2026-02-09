const cacheService = require('../services/cacheService');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Get cache health and statistics
 */
exports.getCacheHealth = async (req, res) => {
  try {
    const health = await cacheService.getHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Get cache health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache health'
    });
  }
};

/**
 * Clear all cache
 */
exports.clearAllCache = async (req, res) => {
  try {
    await cacheService.clearAll();
    
    logger.info('All cache cleared by admin');
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    logger.error('Clear all cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
};

/**
 * Clear specific cache pattern
 */
exports.clearCachePattern = async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required'
      });
    }

    await redisClient.flushPattern(pattern);
    
    logger.info(`Cache pattern cleared: ${pattern}`);
    
    res.json({
      success: true,
      message: `Cache pattern '${pattern}' cleared successfully`
    });
  } catch (error) {
    logger.error('Clear cache pattern error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache pattern'
    });
  }
};

/**
 * Clear specific cache key
 */
exports.clearCacheKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    await cacheService.delete(key);
    
    logger.info(`Cache key cleared: ${key}`);
    
    res.json({
      success: true,
      message: `Cache key '${key}' cleared successfully`
    });
  } catch (error) {
    logger.error('Clear cache key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache key'
    });
  }
};

/**
 * Get cache keys by pattern
 */
exports.getCacheKeys = async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    
    const keys = await redisClient.keys(pattern);
    
    res.json({
      success: true,
      data: {
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100) // Limit to 100 keys for performance
      }
    });
  } catch (error) {
    logger.error('Get cache keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache keys'
    });
  }
};

/**
 * Get cache value by key
 */
exports.getCacheValue = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    const value = await cacheService.get(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Cache key not found'
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    logger.error('Get cache value error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache value'
    });
  }
};

/**
 * Invalidate summaries cache
 */
exports.invalidateSummaries = async (req, res) => {
  try {
    await redisClient.flushPattern('summary:*');
    
    logger.info('Summaries cache invalidated');
    
    res.json({
      success: true,
      message: 'Summaries cache invalidated successfully'
    });
  } catch (error) {
    logger.error('Invalidate summaries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate summaries cache'
    });
  }
};

/**
 * Invalidate questions cache
 */
exports.invalidateQuestions = async (req, res) => {
  try {
    await cacheService.invalidateQuestions();
    
    logger.info('Questions cache invalidated');
    
    res.json({
      success: true,
      message: 'Questions cache invalidated successfully'
    });
  } catch (error) {
    logger.error('Invalidate questions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate questions cache'
    });
  }
};

/**
 * Invalidate stats cache
 */
exports.invalidateStats = async (req, res) => {
  try {
    await cacheService.invalidateStats();
    
    logger.info('Stats cache invalidated');
    
    res.json({
      success: true,
      message: 'Stats cache invalidated successfully'
    });
  } catch (error) {
    logger.error('Invalidate stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate stats cache'
    });
  }
};

/**
 * Warm cache with frequently accessed data
 */
exports.warmCache = async (req, res) => {
  try {
    const { type } = req.body;
    
    // Implement cache warming logic based on type
    // This is a placeholder - implement based on your needs
    
    logger.info(`Cache warming initiated for type: ${type}`);
    
    res.json({
      success: true,
      message: 'Cache warming initiated'
    });
  } catch (error) {
    logger.error('Warm cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
};
