#!/usr/bin/env node

/**
 * Direct Admin Password Fix Script
 * This script connects to the Cloud SQL database and resets the admin password
 * 
 * Usage:
 * 1. Set environment variables or update .env file with Cloud SQL credentials
 * 2. Run: node fix-admin-direct.js
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: process.env.DB_HOST || '/cloudsql/trans-campus-480505-i2:us-central1:research-db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'research_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

console.log('\n🔧 Admin Password Reset Tool\n');
console.log('Connecting to database...');
console.log('Host:', DB_CONFIG.host);
console.log('Database:', DB_CONFIG.database);
console.log('User:', DB_CONFIG.user);
console.log('');

async function fixAdminPassword() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check if admin user exists
    const checkResult = await client.query(
      'SELECT id, username, email, role FROM users WHERE username = $1 OR email = $2',
      ['admin', 'admin@research.com']
    );
    
    if (checkResult.rows.length === 0) {
      console.log('⚠️  Admin user does not exist. Creating new admin user...\n');
      
      // Create admin user
      const password_hash = await bcrypt.hash('Admin@123', 12);
      
      const createResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES ($1, $2, $3, $4, 'admin', true)
        RETURNING id, username, email, full_name, role
      `, ['admin', 'admin@research.com', password_hash, 'System Administrator']);
      
      console.log('✅ Admin user created successfully!\n');
      console.log('User Details:');
      console.log(createResult.rows[0]);
      
    } else {
      console.log('ℹ️  Admin user found. Resetting password...\n');
      console.log('Current user:', checkResult.rows[0]);
      console.log('');
      
      // Update password
      const password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK';
      
      const updateResult = await client.query(`
        UPDATE users 
        SET password_hash = $1,
            role = 'admin',
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE username = 'admin' OR email = 'admin@research.com'
        RETURNING id, username, email, role, is_active, updated_at
      `, [password_hash]);
      
      console.log('✅ Password reset successfully!\n');
      console.log('Updated user:', updateResult.rows[0]);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS!');
    console.log('='.repeat(60));
    console.log('\n📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('   Email: admin@research.com');
    console.log('\n🌐 Login URL:');
    console.log('   https://research-system-864580156744.us-central1.run.app/auth/login');
    console.log('\n⚠️  Please change the password after first login!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetails:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check your .env file has correct database credentials');
    console.error('2. Ensure DB_PASSWORD is set');
    console.error('3. For Cloud SQL, you may need to use Cloud SQL Proxy');
    console.error('4. Check if the users table exists (run migrations first)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the fix
fixAdminPassword();
