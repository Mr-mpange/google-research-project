const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { authenticate, authorize } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Public endpoints (Africa's Talking callbacks)
router.post('/callback', rateLimiter.voice, voiceController.handleCallback);
router.post('/status', rateLimiter.voice, voiceController.handleStatusUpdate);
router.post('/recording', rateLimiter.voice, voiceController.handleRecording);

// Protected endpoints (require authentication)
router.use(authenticate);

// Voice call management
router.get('/calls', voiceController.getCalls);
router.get('/calls/:callId', voiceController.getCall);
router.post('/initiate', authorize('admin', 'researcher'), voiceController.initiateCall);

// Voice analytics
router.get('/analytics', voiceController.getAnalytics);

module.exports = router;