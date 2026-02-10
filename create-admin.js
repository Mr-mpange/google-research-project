const bcrypt = require('bcryptjs');
const db = require('./src/database/connection');
const logger = require('./src/utils/logger');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  try {
    console.log('\n=== Create Admin User ===\n');

    // Get user input
    const username = await question('Enter username (default: admin): ') || 'admin';
    const email = await question('Enter email (default: admin@research.com): ') || 'admin@research.com';
    const fullName = await question('Enter full name (default: System Administrator): ') || 'System Administrator';
    const password = await question('Enter password (default: Admin@123): ') || 'Admin@123';

    console.log('\nCreating admin user...');

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      console.log('\n⚠️  User already exists:');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Username: ${existing.username}`);
      console.log(`   Email: ${existing.email}`);
      
      const update = await question('\nDo you want to update this user to admin role? (yes/no): ');
      
      if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        await db.query(`
          UPDATE users 
          SET role = 'admin', 
              password_hash = $1,
              full_name = $2,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [password_hash, fullName, existing.id]);
        
        console.log('\n✅ User updated to admin successfully!');
        console.log(`   ID: ${existing.id}`);
        console.log(`   Username: ${existing.username}`);
        console.log(`   Email: ${existing.email}`);
        console.log(`   Role: admin`);
        
        logger.info('Admin user updated', { userId: existing.id, username: existing.username });
      } else {
        console.log('\n❌ Operation cancelled.');
      }
      
      rl.close();
      process.exit(0);
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, 'admin', true)
      RETURNING id, username, email, full_name, role, is_active, created_at
    `, [username, email, password_hash, fullName]);

    const newUser = result.rows[0];

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Full Name: ${newUser.full_name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Created: ${newUser.created_at}`);
    console.log('\n📝 Login credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please change the password after first login!\n');

    logger.info('Admin user created', { userId: newUser.id, username: newUser.username });

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    logger.error('Admin user creation failed:', error);
    rl.close();
    process.exit(1);
  }
}

createAdminUser();
