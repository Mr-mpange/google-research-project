const aiService = require('../services/aiService');
const logger = require('../utils/logger');

class AIWorker {
  constructor() {
    this.isRunning = false;
    this.processingInterval = 30000; // 30 seconds
    this.batchSize = 5;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('AI Worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('AI Worker started');

    // Process immediately on start
    await this.processRecordings();

    // Set up recurring processing
    this.intervalId = setInterval(async () => {
      await this.processRecordings();
    }, this.processingInterval);

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async processRecordings() {
    try {
      logger.info('AI Worker: Starting batch processing');
      
      const processedCount = await aiService.batchProcessRecordings(this.batchSize);
      
      if (processedCount > 0) {
        logger.info(`AI Worker: Processed ${processedCount} recordings`);
      } else {
        logger.debug('AI Worker: No recordings to process');
      }

    } catch (error) {
      logger.error('AI Worker processing error:', error);
    }
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('AI Worker stopping...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    logger.info('AI Worker stopped');
    process.exit(0);
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  const worker = new AIWorker();
  worker.start().catch(error => {
    logger.error('Failed to start AI Worker:', error);
    process.exit(1);
  });
}

module.exports = AIWorker;