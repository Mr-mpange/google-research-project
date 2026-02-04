const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// Dashboard routes (require authentication)
router.use(authenticate);

// Main dashboard
router.get('/', dashboardController.dashboard);
router.get('/dashboard', dashboardController.dashboard);

// Analytics pages
router.get('/analytics', dashboardController.analytics);
router.get('/responses', dashboardController.responses);
router.get('/calls', dashboardController.calls);
router.get('/transcriptions', dashboardController.transcriptions);

// Management pages (admin only)
router.get('/questions', authorize('admin', 'researcher'), dashboardController.questions);
router.get('/users', authorize('admin'), dashboardController.users);
router.get('/campaigns', authorize('admin', 'researcher'), dashboardController.campaigns);

// Export functionality
router.get('/export/responses', dashboardController.exportResponses);
router.get('/export/analytics', dashboardController.exportAnalytics);

module.exports = router;