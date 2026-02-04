const express = require('express');
const router = express.Router();
const ussdController = require('../controllers/ussdController');
const rateLimiter = require('../middleware/rateLimiter');

// Apply USSD-specific rate limiting
router.use(rateLimiter.ussd);

// Main USSD callback endpoint
router.post('/callback', ussdController.handleCallback);

// USSD session management
router.get('/sessions', ussdController.getSessions);
router.get('/sessions/:sessionId', ussdController.getSession);

// USSD analytics
router.get('/analytics', ussdController.getAnalytics);

module.exports = router;