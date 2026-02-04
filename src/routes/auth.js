const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimiter = require('../middleware/rateLimiter');

// Apply auth-specific rate limiting
router.use(rateLimiter.auth);

// Authentication routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);

// Password management
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;