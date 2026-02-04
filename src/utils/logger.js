const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'research-system' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom logging methods for specific use cases
logger.ussd = (phoneNumber, action, data = {}) => {
  logger.info('USSD Activity', {
    type: 'ussd',
    phoneNumber,
    action,
    ...data
  });
};

logger.voice = (phoneNumber, action, data = {}) => {
  logger.info('Voice Activity', {
    type: 'voice',
    phoneNumber,
    action,
    ...data
  });
};

logger.ai = (action, data = {}) => {
  logger.info('AI Processing', {
    type: 'ai',
    action,
    ...data
  });
};

logger.security = (action, data = {}) => {
  logger.warn('Security Event', {
    type: 'security',
    action,
    ...data
  });
};

module.exports = logger;