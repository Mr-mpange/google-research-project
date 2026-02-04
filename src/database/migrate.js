const fs = require('fs');
const path = require('path');
const db = require('./connection');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    logger.info('Database schema created successfully');
    
    // Check if we need to create default admin user
    const userCheck = await db.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    
    if (parseInt(userCheck.rows[0].count) === 0) {
      logger.info('Creating default admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin', 'admin@research.local', hashedPassword, 'System Administrator', 'admin']);
      
      logger.info('Default admin user created (username: admin, password: admin123)');
    }
    
    logger.info('Migrations completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };