const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migrationController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Check migration status
router.get('/status', migrationController.checkMigrationStatus);

// Fix user statuses (set all to active)
router.post('/fix-user-statuses', migrationController.fixUserStatuses);

// Run approval system migration
router.post('/run-approval-system', migrationController.runApprovalMigration);

module.exports = router;
