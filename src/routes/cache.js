const express = require('express');
const router = express.Router();
const cacheController = require('../controllers/cacheController');
const { authenticate, authorize } = require('../middleware/auth');

// All cache routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Cache health and statistics
router.get('/health', cacheController.getCacheHealth);

// Cache management
router.delete('/clear', cacheController.clearAllCache);
router.post('/clear/pattern', cacheController.clearCachePattern);
router.delete('/clear/:key', cacheController.clearCacheKey);

// Cache inspection
router.get('/keys', cacheController.getCacheKeys);
router.get('/value/:key', cacheController.getCacheValue);

// Specific cache invalidation
router.delete('/summaries', cacheController.invalidateSummaries);
router.delete('/questions', cacheController.invalidateQuestions);
router.delete('/stats', cacheController.invalidateStats);

// Cache warming
router.post('/warm', cacheController.warmCache);

module.exports = router;
