const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Apply API rate limiting
router.use(rateLimiter.general);

// Public health check
router.get('/health', apiController.getHealth);

// Public AI test (for debugging)
router.get('/ai-status', apiController.getAIStatus);

// Protected routes (require authentication)
// In development mode, use optional auth to allow testing without login
router.use(process.env.NODE_ENV === 'development' ? optionalAuth : authenticate);

// Research questions
router.get('/questions', apiController.getQuestions);
router.post('/questions', authorize('admin', 'researcher'), apiController.createQuestion);
router.put('/questions/:questionId', authorize('admin', 'researcher'), apiController.updateQuestion);
router.delete('/questions/:questionId', authorize('admin'), apiController.deleteQuestion);

// Research responses
router.get('/responses', apiController.getResponses);
router.get('/responses/:responseId', apiController.getResponse);

// Analytics
router.get('/analytics', apiController.getAnalytics);

// AI processing
router.post('/ai/process', authorize('admin', 'researcher'), apiController.processAI);

// Test AI service
router.post('/ai/test', authorize('admin', 'researcher'), apiController.testAI);

module.exports = router;