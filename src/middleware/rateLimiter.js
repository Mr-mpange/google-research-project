const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.'
    });
  }
});

// USSD callback limiter (more lenient for legitimate traffic)
const ussdLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: 'USSD rate limit exceeded'
  },
  handler: (req, res) => {
    logger.security('USSD rate limit exceeded', {
      ip: req.ip,
      phoneNumber: req.body?.phoneNumber,
      sessionId: req.body?.sessionId
    });
    res.status(429).json({
      error: 'USSD rate limit exceeded'
    });
  }
});

// Voice callback limiter
const voiceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    error: 'Voice rate limit exceeded'
  },
  handler: (req, res) => {
    logger.security('Voice rate limit exceeded', {
      ip: req.ip,
      phoneNumber: req.body?.phoneNumber,
      callId: req.body?.callId
    });
    res.status(429).json({
      error: 'Voice rate limit exceeded'
    });
  }
});

module.exports = {
  general: generalLimiter,
  auth: authLimiter,
  ussd: ussdLimiter,
  voice: voiceLimiter
};