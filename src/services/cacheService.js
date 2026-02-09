const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // Default TTL values (in seconds)
    this.TTL = {
      SHORT: 300,        // 5 minutes
      MEDIUM: 1800,      // 30 minutes
      LONG: 3600,        // 1 hour
      VERY_LONG: 86400,  // 24 hours
      WEEK: 604800       // 7 days
    };

    // Cache key prefixes
    this.PREFIX = {
      SUMMARY: 'summary:',
      TRANSCRIPTION: 'transcription:',
      QUESTION: 'question:',
      PARTICIPANT: 'participant:',
      STATS: 'stats:',
      SESSION: 'session:',
      ANALYSIS: 'analysis:',
      REPORT: 'report:'
    };
  }

  // Generate cache key
  generateKey(prefix, identifier) {
    return `${prefix}${identifier}`;
  }

  // AI Summary caching
  async getSummary(responseId) {
    const key = this.generateKey(this.PREFIX.SUMMARY, responseId);
    return await redisClient.get(key);
  }

  async setSummary(responseId, summary, ttl = this.TTL.VERY_LONG) {
    const key = this.generateKey(this.PREFIX.SUMMARY, responseId);
    return await redisClient.set(key, summary, ttl);
  }

  async invalidateSummary(responseId) {
    const key = this.generateKey(this.PREFIX.SUMMARY, responseId);
    return await redisClient.del(key);
  }

  // Transcription caching
  async getTranscription(responseId) {
    const key = this.generateKey(this.PREFIX.TRANSCRIPTION, responseId);
    return await redisClient.get(key);
  }

  async setTranscription(responseId, transcription, ttl = this.TTL.VERY_LONG) {
    const key = this.generateKey(this.PREFIX.TRANSCRIPTION, responseId);
    return await redisClient.set(key, transcription, ttl);
  }

  async invalidateTranscription(responseId) {
    const key = this.generateKey(this.PREFIX.TRANSCRIPTION, responseId);
    return await redisClient.del(key);
  }

  // Question caching
  async getQuestion(questionId) {
    const key = this.generateKey(this.PREFIX.QUESTION, questionId);
    return await redisClient.get(key);
  }

  async setQuestion(questionId, question, ttl = this.TTL.LONG) {
    const key = this.generateKey(this.PREFIX.QUESTION, questionId);
    return await redisClient.set(key, question, ttl);
  }

  async getActiveQuestions() {
    const key = `${this.PREFIX.QUESTION}active`;
    return await redisClient.get(key);
  }

  async setActiveQuestions(questions, ttl = this.TTL.MEDIUM) {
    const key = `${this.PREFIX.QUESTION}active`;
    return await redisClient.set(key, questions, ttl);
  }

  async invalidateQuestions() {
    return await redisClient.flushPattern(`${this.PREFIX.QUESTION}*`);
  }

  // Participant caching
  async getParticipant(phoneNumber) {
    const key = this.generateKey(this.PREFIX.PARTICIPANT, phoneNumber);
    return await redisClient.get(key);
  }

  async setParticipant(phoneNumber, participant, ttl = this.TTL.LONG) {
    const key = this.generateKey(this.PREFIX.PARTICIPANT, phoneNumber);
    return await redisClient.set(key, participant, ttl);
  }

  async invalidateParticipant(phoneNumber) {
    const key = this.generateKey(this.PREFIX.PARTICIPANT, phoneNumber);
    return await redisClient.del(key);
  }

  // Statistics caching
  async getStats(statsType) {
    const key = this.generateKey(this.PREFIX.STATS, statsType);
    return await redisClient.get(key);
  }

  async setStats(statsType, stats, ttl = this.TTL.MEDIUM) {
    const key = this.generateKey(this.PREFIX.STATS, statsType);
    return await redisClient.set(key, stats, ttl);
  }

  async invalidateStats() {
    return await redisClient.flushPattern(`${this.PREFIX.STATS}*`);
  }

  // Session caching (for USSD/Voice sessions)
  async getSession(sessionId) {
    const key = this.generateKey(this.PREFIX.SESSION, sessionId);
    return await redisClient.get(key);
  }

  async setSession(sessionId, sessionData, ttl = this.TTL.SHORT) {
    const key = this.generateKey(this.PREFIX.SESSION, sessionId);
    return await redisClient.set(key, sessionData, ttl);
  }

  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (session) {
      const updatedSession = { ...session, ...updates };
      return await this.setSession(sessionId, updatedSession);
    }
    return false;
  }

  async deleteSession(sessionId) {
    const key = this.generateKey(this.PREFIX.SESSION, sessionId);
    return await redisClient.del(key);
  }

  // Analysis caching (for complex AI analysis)
  async getAnalysis(analysisId) {
    const key = this.generateKey(this.PREFIX.ANALYSIS, analysisId);
    return await redisClient.get(key);
  }

  async setAnalysis(analysisId, analysis, ttl = this.TTL.LONG) {
    const key = this.generateKey(this.PREFIX.ANALYSIS, analysisId);
    return await redisClient.set(key, analysis, ttl);
  }

  async invalidateAnalysis(analysisId) {
    const key = this.generateKey(this.PREFIX.ANALYSIS, analysisId);
    return await redisClient.del(key);
  }

  // Report caching
  async getReport(reportId) {
    const key = this.generateKey(this.PREFIX.REPORT, reportId);
    return await redisClient.get(key);
  }

  async setReport(reportId, report, ttl = this.TTL.LONG) {
    const key = this.generateKey(this.PREFIX.REPORT, reportId);
    return await redisClient.set(key, report, ttl);
  }

  async invalidateReport(reportId) {
    const key = this.generateKey(this.PREFIX.REPORT, reportId);
    return await redisClient.del(key);
  }

  async invalidateAllReports() {
    return await redisClient.flushPattern(`${this.PREFIX.REPORT}*`);
  }

  // Generic cache operations
  async get(key) {
    return await redisClient.get(key);
  }

  async set(key, value, ttl = this.TTL.MEDIUM) {
    return await redisClient.set(key, value, ttl);
  }

  async delete(key) {
    return await redisClient.del(key);
  }

  // Cache-aside pattern helper
  async getOrSet(key, fetchFunction, ttl = this.TTL.MEDIUM) {
    try {
      // Try to get from cache
      let data = await redisClient.get(key);
      
      if (data !== null) {
        logger.debug(`Cache hit for key: ${key}`);
        return data;
      }

      // Cache miss - fetch data
      logger.debug(`Cache miss for key: ${key}, fetching...`);
      data = await fetchFunction();

      // Store in cache
      if (data !== null && data !== undefined) {
        await redisClient.set(key, data, ttl);
      }

      return data;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // On error, try to fetch directly
      return await fetchFunction();
    }
  }

  // Batch operations
  async mGet(keys) {
    if (!redisClient.isReady()) return {};
    
    try {
      const results = {};
      for (const key of keys) {
        results[key] = await redisClient.get(key);
      }
      return results;
    } catch (error) {
      logger.error('Cache mGet error:', error);
      return {};
    }
  }

  async mSet(keyValuePairs, ttl = this.TTL.MEDIUM) {
    if (!redisClient.isReady()) return false;
    
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        await redisClient.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      logger.error('Cache mSet error:', error);
      return false;
    }
  }

  // Clear all cache
  async clearAll() {
    if (!redisClient.isReady()) return false;
    
    try {
      const keys = await redisClient.keys('*');
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
        logger.info(`Cleared ${keys.length} cache keys`);
      }
      return true;
    } catch (error) {
      logger.error('Cache clearAll error:', error);
      return false;
    }
  }

  // Get cache health status
  async getHealth() {
    return {
      redis: redisClient.isReady(),
      stats: await redisClient.getStats()
    };
  }

  // Increment counter (useful for rate limiting, stats)
  async incrementCounter(key, amount = 1, ttl = null) {
    const result = await redisClient.increment(key, amount);
    if (ttl && result === amount) {
      // Set TTL only on first increment
      await redisClient.expire(key, ttl);
    }
    return result;
  }

  // Rate limiting helper
  async checkRateLimit(identifier, limit, windowSeconds) {
    const key = `ratelimit:${identifier}`;
    const current = await this.incrementCounter(key, 1, windowSeconds);
    
    return {
      allowed: current <= limit,
      current,
      limit,
      remaining: Math.max(0, limit - current)
    };
  }

  // Store recent activity (using lists)
  async addRecentActivity(userId, activity, maxItems = 50) {
    const key = `activity:${userId}`;
    await redisClient.lPush(key, activity);
    
    // Trim to keep only recent items
    const client = redisClient.getClient();
    if (client) {
      await client.lTrim(key, 0, maxItems - 1);
    }
  }

  async getRecentActivity(userId, count = 10) {
    const key = `activity:${userId}`;
    return await redisClient.lRange(key, 0, count - 1);
  }

  // Leaderboard/sorted sets (for future use)
  async addToLeaderboard(leaderboardName, member, score) {
    if (!redisClient.isReady()) return false;
    
    try {
      const client = redisClient.getClient();
      await client.zAdd(leaderboardName, { score, value: member });
      return true;
    } catch (error) {
      logger.error('Add to leaderboard error:', error);
      return false;
    }
  }

  async getLeaderboard(leaderboardName, start = 0, stop = 9) {
    if (!redisClient.isReady()) return [];
    
    try {
      const client = redisClient.getClient();
      return await client.zRange(leaderboardName, start, stop, { REV: true, WITHSCORES: true });
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      return [];
    }
  }
}

module.exports = new CacheService();
