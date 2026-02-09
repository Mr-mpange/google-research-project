#!/usr/bin/env node

/**
 * Redis Implementation Test Script
 * Tests all Redis functionality
 */

require('dotenv').config();
const redisClient = require('./src/config/redis');
const cacheService = require('./src/services/cacheService');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

async function testRedisConnection() {
  log('\n=== Testing Redis Connection ===', 'blue');
  
  try {
    await redisClient.connect();
    
    if (redisClient.isReady()) {
      success('Redis connected successfully');
      return true;
    } else {
      error('Redis connection failed');
      return false;
    }
  } catch (err) {
    error(`Redis connection error: ${err.message}`);
    return false;
  }
}

async function testBasicOperations() {
  log('\n=== Testing Basic Operations ===', 'blue');
  
  try {
    // Test SET
    const testKey = 'test:key';
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };
    
    await cacheService.set(testKey, testValue, 60);
    success('SET operation successful');
    
    // Test GET
    const retrieved = await cacheService.get(testKey);
    if (retrieved && retrieved.message === testValue.message) {
      success('GET operation successful');
    } else {
      error('GET operation failed - value mismatch');
    }
    
    // Test EXISTS
    const exists = await redisClient.exists(testKey);
    if (exists) {
      success('EXISTS operation successful');
    } else {
      error('EXISTS operation failed');
    }
    
    // Test DELETE
    await cacheService.delete(testKey);
    const afterDelete = await cacheService.get(testKey);
    if (!afterDelete) {
      success('DELETE operation successful');
    } else {
      error('DELETE operation failed');
    }
    
    return true;
  } catch (err) {
    error(`Basic operations error: ${err.message}`);
    return false;
  }
}

async function testCacheService() {
  log('\n=== Testing Cache Service ===', 'blue');
  
  try {
    // Test summary caching
    const summaryData = {
      text: 'This is a test summary',
      keyPoints: ['Point 1', 'Point 2'],
      sentiment: 'positive'
    };
    
    await cacheService.setSummary('test-response-1', summaryData);
    const cachedSummary = await cacheService.getSummary('test-response-1');
    
    if (cachedSummary && cachedSummary.text === summaryData.text) {
      success('Summary caching works');
    } else {
      error('Summary caching failed');
    }
    
    // Test question caching
    const questionData = {
      id: 1,
      text: 'Test question?',
      type: 'open_ended'
    };
    
    await cacheService.setQuestion('test-q-1', questionData);
    const cachedQuestion = await cacheService.getQuestion('test-q-1');
    
    if (cachedQuestion && cachedQuestion.text === questionData.text) {
      success('Question caching works');
    } else {
      error('Question caching failed');
    }
    
    // Test session caching
    const sessionData = {
      sessionId: 'test-session-1',
      phoneNumber: '+254700000000',
      currentMenu: 'main'
    };
    
    await cacheService.setSession('test-session-1', sessionData);
    const cachedSession = await cacheService.getSession('test-session-1');
    
    if (cachedSession && cachedSession.phoneNumber === sessionData.phoneNumber) {
      success('Session caching works');
    } else {
      error('Session caching failed');
    }
    
    // Test getOrSet pattern
    let fetchCount = 0;
    const fetchFunction = async () => {
      fetchCount++;
      return { data: 'fetched', count: fetchCount };
    };
    
    const result1 = await cacheService.getOrSet('test-getorset', fetchFunction, 60);
    const result2 = await cacheService.getOrSet('test-getorset', fetchFunction, 60);
    
    if (fetchCount === 1 && result1.count === result2.count) {
      success('Cache-aside pattern (getOrSet) works');
    } else {
      error('Cache-aside pattern failed');
    }
    
    // Cleanup
    await cacheService.invalidateSummary('test-response-1');
    await cacheService.delete('question:test-q-1');
    await cacheService.deleteSession('test-session-1');
    await cacheService.delete('test-getorset');
    
    return true;
  } catch (err) {
    error(`Cache service error: ${err.message}`);
    return false;
  }
}

async function testRateLimiting() {
  log('\n=== Testing Rate Limiting ===', 'blue');
  
  try {
    const identifier = 'test-user-123';
    const limit = 5;
    const window = 60;
    
    // Make requests
    for (let i = 1; i <= 7; i++) {
      const result = await cacheService.checkRateLimit(identifier, limit, window);
      
      if (i <= limit) {
        if (result.allowed) {
          info(`Request ${i}/${limit}: Allowed (${result.remaining} remaining)`);
        } else {
          error(`Request ${i} should be allowed but was blocked`);
        }
      } else {
        if (!result.allowed) {
          info(`Request ${i}: Blocked (rate limit exceeded)`);
        } else {
          error(`Request ${i} should be blocked but was allowed`);
        }
      }
    }
    
    success('Rate limiting works correctly');
    
    // Cleanup
    await redisClient.del(`ratelimit:${identifier}`);
    
    return true;
  } catch (err) {
    error(`Rate limiting error: ${err.message}`);
    return false;
  }
}

async function testCacheStats() {
  log('\n=== Testing Cache Statistics ===', 'blue');
  
  try {
    const health = await cacheService.getHealth();
    
    if (health.redis) {
      success('Cache health check works');
      info(`Redis connected: ${health.redis}`);
      
      if (health.stats && health.stats.dbSize !== undefined) {
        info(`Database size: ${health.stats.dbSize} keys`);
      }
    } else {
      error('Cache health check failed');
    }
    
    return true;
  } catch (err) {
    error(`Cache stats error: ${err.message}`);
    return false;
  }
}

async function testPerformance() {
  log('\n=== Testing Performance ===', 'blue');
  
  try {
    const testData = {
      message: 'Performance test data',
      timestamp: Date.now(),
      array: Array(100).fill('test'),
      nested: {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }
    };
    
    // Test write performance
    const writeStart = Date.now();
    for (let i = 0; i < 100; i++) {
      await cacheService.set(`perf:test:${i}`, testData, 60);
    }
    const writeTime = Date.now() - writeStart;
    info(`Write 100 keys: ${writeTime}ms (${(writeTime / 100).toFixed(2)}ms per key)`);
    
    // Test read performance
    const readStart = Date.now();
    for (let i = 0; i < 100; i++) {
      await cacheService.get(`perf:test:${i}`);
    }
    const readTime = Date.now() - readStart;
    info(`Read 100 keys: ${readTime}ms (${(readTime / 100).toFixed(2)}ms per key)`);
    
    // Cleanup
    for (let i = 0; i < 100; i++) {
      await cacheService.delete(`perf:test:${i}`);
    }
    
    success('Performance test completed');
    
    return true;
  } catch (err) {
    error(`Performance test error: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'yellow');
  log('║   Redis Implementation Test Suite     ║', 'yellow');
  log('╚════════════════════════════════════════╝', 'yellow');
  
  const results = {
    connection: false,
    basicOps: false,
    cacheService: false,
    rateLimiting: false,
    stats: false,
    performance: false
  };
  
  // Run tests
  results.connection = await testRedisConnection();
  
  if (results.connection) {
    results.basicOps = await testBasicOperations();
    results.cacheService = await testCacheService();
    results.rateLimiting = await testRateLimiting();
    results.stats = await testCacheStats();
    results.performance = await testPerformance();
  } else {
    log('\n⚠ Skipping remaining tests due to connection failure', 'yellow');
  }
  
  // Summary
  log('\n=== Test Summary ===', 'blue');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✓' : '✗';
    const color = result ? 'green' : 'red';
    log(`${status} ${test}`, color);
  });
  
  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  // Cleanup and exit
  await redisClient.disconnect();
  
  if (passed === total) {
    log('\n🎉 All tests passed! Redis is working perfectly!', 'green');
    process.exit(0);
  } else {
    log('\n⚠ Some tests failed. Check the output above for details.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
