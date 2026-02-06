const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate, authorize } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Public endpoints (Africa's Talking webhooks)
router.post('/delivery-report', rateLimiter.general, smsController.handleDeliveryReport);

// Test connection endpoint (public for debugging)
router.get('/test-connection', smsController.testConnection);

// Protected endpoints (require authentication)
router.use(authenticate);

// Send research invitations
router.post('/invite', authorize('admin', 'researcher'), smsController.sendInvitation);

// Send thank you SMS (for testing/admin)
router.post('/thank-you', authorize('admin', 'researcher'), smsController.sendThankYou);

// Send bulk messages
router.post('/bulk', authorize('admin'), smsController.sendBulkMessage);

// Get SMS statistics
router.get('/statistics', smsController.getStatistics);

module.exports = router;