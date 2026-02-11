/**
 * Reset admin password by directly updating the database
 * This script connects to Cloud SQL and resets the admin password
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: '/cloudsql/trans-campus-480505-i2:us-central1:research-db', // Cloud SQL socket
  user: 'postgres',
  password: 'ResearchDB2024!',
  database: 'research_system',
};

async function resetAdminPassword() {
  const client = new Client(DB_CONFIG);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check if adminuser exists
    const checkQuery = 'SELECT id, username, email, role FROM users WHERE username = $1';
    const checkResult = await client.query(checkQuery, ['adminuser']);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ User "adminuser" not found in database');
      console.log('Creating new admin user...\n');
      
      // Create new admin user
      const newPassword = 'Admin@123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const insertQuery = `
        INSERT INTO users (username, email, password_hash, full_name, role, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, username, email, role
      `;
      
      const insertResult = await client.query(insertQuery, [
        'adminuser',
        'adminuser@research.com',
        hashedPassword,
        'System Administrator',
        'admin',
        'active',
        true
      ]);
      
      console.log('✅ Admin user created successfully!');
      console.log(insertResult.rows[0]);
    } else {
      console.log('Found admin user:');
      console.log(checkResult.rows[0]);
      console.log('\nResetting password...\n');
      
      // Reset password
      const newPassword = 'Admin@123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            status = 'active',
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE username = $2
        RETURNING id, username, email, role, status, is_active
      `;
      
      const updateResult = await client.query(updateQuery, [hashedPassword, 'adminuser']);
      
      console.log('✅ Password reset successfully!');
      console.log(updateResult.rows[0]);
    }
    
    console.log('\n========================================');
    console.log('LOGIN CREDENTIALS:');
    console.log('========================================');
    console.log('Username: adminuser');
    console.log('Password: Admin@123');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.log('\n⚠️  This script must be run from Google Cloud Shell or a VM with Cloud SQL Proxy');
      console.log('   It cannot connect to Cloud SQL from your local machine directly.');
    }
  } finally {
    await client.end();
  }
}

resetAdminPassword();
