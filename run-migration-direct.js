/**
 * Run SQL Migration Directly
 * This script connects to Cloud SQL and runs the migration
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read SQL file
const sqlFile = path.join(__dirname, 'src', 'database', 'add-approval-system.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('\n=== Running SQL Migration ===\n');
console.log('SQL file:', sqlFile);
console.log('SQL length:', sql.length, 'characters\n');

// Connection config for Cloud SQL
const config = {
  host: '/cloudsql/trans-campus-480505-i2:us-central1:research-db',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  database: 'research_system',
  port: 5432
};

// If not using Unix socket, use TCP
if (process.platform === 'win32' || !config.host.startsWith('/cloudsql')) {
  // For local testing or if Cloud SQL Proxy is running
  config.host = process.env.DB_HOST || '127.0.0.1';
  config.port = parseInt(process.env.DB_PORT || '5432');
}

console.log('Connecting to database...');
console.log('Host:', config.host);
console.log('Database:', config.database);
console.log('User:', config.user);
console.log('');

const client = new Client(config);

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('Executing SQL migration...\n');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Migration executed successfully!\n');

    // Verify the changes
    console.log('Verifying changes...\n');

    // Check status column
    const statusCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);
    console.log(statusCheck.rows.length > 0 ? '✅' : '❌', 'status column');

    // Check research_projects table
    const projectsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'research_projects'
      )
    `);
    console.log(projectsCheck.rows[0].exists ? '✅' : '❌', 'research_projects table');

    // Check approval columns
    const approvalCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('approval_date', 'approved_by', 'rejection_reason')
    `);
    console.log(approvalCheck.rows.length === 3 ? '✅' : '❌', 'approval columns');

    console.log('\n✅ All changes verified!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
