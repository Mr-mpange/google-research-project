const db = require('./connection');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Create default admin user
    try {
      const adminPassword = 'Admin@123';
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(adminPassword, saltRounds);
      
      const existingAdmin = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        ['admin', 'admin@research.com']
      );
      
      if (existingAdmin.rows.length === 0) {
        await db.query(`
          INSERT INTO users (username, email, password_hash, full_name, role, is_active)
          VALUES ($1, $2, $3, $4, 'admin', true)
        `, ['admin', 'admin@research.com', password_hash, 'System Administrator']);
        
        logger.info('Default admin user created (username: admin, password: Admin@123)');
        console.log('\n✅ Default admin user created:');
        console.log('   Username: admin');
        console.log('   Password: Admin@123');
        console.log('   Email: admin@research.com');
        console.log('   ⚠️  Please change the password after first login!\n');
      } else {
        logger.info('Admin user already exists, skipping creation');
      }
    } catch (error) {
      logger.error('Error creating admin user:', error);
    }
    
    // Add sample research questions
    const questions = [
      {
        id: uuidv4(),
        title: 'Community Health',
        description: 'Questions about health services in your community',
        question_text: 'How would you rate the health services in your community?',
        category: 'health',
        language: 'en',
        is_active: true
      },
      {
        id: uuidv4(),
        title: 'Education Access',
        description: 'Questions about education in your area',
        question_text: 'What are the main challenges facing education in your area?',
        category: 'education',
        language: 'en',
        is_active: true
      },
      {
        id: uuidv4(),
        title: 'Economic Opportunities',
        description: 'Questions about job opportunities',
        question_text: 'What kind of job opportunities would you like to see in your community?',
        category: 'economic',
        language: 'en',
        is_active: true
      }
    ];

    for (const question of questions) {
      try {
        await db.query(`
          INSERT INTO research_questions (id, title, description, question_text, category, language, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          question.id,
          question.title,
          question.description,
          question.question_text,
          question.category,
          question.language,
          question.is_active
        ]);
        
        logger.info(`Added question: ${question.title}`);
      } catch (error) {
        logger.error(`Error adding question ${question.title}:`, error);
      }
    }
    
    logger.info('Database seeding completed successfully');
    
  } catch (error) {
    logger.error('Seeding failed:', error);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = { seedDatabase };