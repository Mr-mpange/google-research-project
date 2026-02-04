const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./database/connection');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Route imports
const ussdRoutes = require('./routes/ussd');
const voiceRoutes = require('./routes/voice');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : true,
  credentials: true
}));

// Rate limiting
app.use(rateLimiter.general);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Simple test endpoint for Africa's Talking
app.post('/test/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  
  logger.info('Test USSD callback received', {
    sessionId, serviceCode, phoneNumber, text
  });
  
  if (!text || text === '') {
    // Initial request
    res.send('CON Welcome to Research System Test\n1. Test Option 1\n2. Test Option 2\n0. Exit');
  } else if (text === '1') {
    res.send('END You selected Option 1. Test successful!');
  } else if (text === '2') {
    res.send('END You selected Option 2. Test successful!');
  } else if (text === '0') {
    res.send('END Thank you for testing!');
  } else {
    res.send('CON Invalid option. Try again:\n1. Test Option 1\n2. Test Option 2\n0. Exit');
  }
});

// Routes
app.use('/ussd', ussdRoutes);
app.use('/voice', voiceRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/', dashboardRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;