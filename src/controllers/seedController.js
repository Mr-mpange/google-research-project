const { seedDatabase } = require('../database/seed');
const logger = require('../utils/logger');

class SeedController {
  async runSeed(req, res) {
    try {
      logger.info('Seed endpoint called');
      
      await seedDatabase();
      
      res.json({
        success: true,
        message: 'Database seeded successfully. Admin user created with username: admin, password: Admin@123'
      });
      
    } catch (error) {
      logger.error('Seed endpoint error:', error);
      res.status(500).json({
        error: 'Seeding failed',
        details: error.message
      });
    }
  }
}

module.exports = new SeedController();
