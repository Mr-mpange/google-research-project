const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');

// Apply API rate limiting
router.use(rateLimiter.general);

// Public health check
router.get('/health', apiController.getHealth);

// Public AI test (for debugging)
router.get('/ai-status', cacheMiddleware(60), apiController.getAIStatus);

// Public questions endpoint (read-only)
router.get('/questions', cacheMiddleware(1800), apiController.getQuestions);

// Temporarily public for seeding and testing - REMOVE IN PRODUCTION
router.post('/questions', 
  invalidateCache(['api:/api/questions*', 'api:/api/analytics*']),
  apiController.createQuestion
);
router.put('/questions/:questionId', 
  invalidateCache(['api:/api/questions*', 'api:/api/analytics*']),
  apiController.updateQuestion
);
router.delete('/questions/:questionId', 
  invalidateCache(['api:/api/questions*', 'api:/api/analytics*']),
  apiController.deleteQuestion
);

// Public analytics and responses (read-only)
router.get('/responses', cacheMiddleware(300), apiController.getResponses);
router.get('/responses/:responseId', cacheMiddleware(600), apiController.getResponse);
router.get('/analytics', cacheMiddleware(600), apiController.getAnalytics);

// Temporarily public AI processing for testing - SECURE IN PRODUCTION
router.post('/ai/process', 
  invalidateCache(['api:/api/responses*', 'api:/api/analytics*']),
  apiController.processAI
);

// Protected routes (require authentication)
// In development mode, use optional auth to allow testing without login
router.use(process.env.NODE_ENV === 'development' ? optionalAuth : authenticate);

// Test AI service
router.post('/ai/test', authorize('admin', 'researcher'), apiController.testAI);

module.exports = router;