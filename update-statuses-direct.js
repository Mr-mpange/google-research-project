/**
 * Update user statuses directly using pg client
 */

const { Client } = require('pg');

const client = new Client({
  host: '136.113.39.253', // Cloud SQL public IP
  port: 5432,
  database: 'research_system',
  user: 'postgres',
  password: 'ResearchDB2024!'
});

async function updateStatuses() {
  console.log('\n=== Updating User Statuses ===\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Update all users to active
    console.log('Updating all users to active status...');
    const result = await client.query(`
      UPDATE users 
      SET status = 'active' 
      WHERE status = 'pending' OR status IS NULL
      RETURNING id, username, role, status
    `);

    console.log(`✅ Updated ${result.rows.length} users\n`);
    console.log('Updated users:');
    result.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}): ${user.status}`);
    });

    // Verify
    console.log('\nVerifying all users...');
    const verify = await client.query(`
      SELECT username, role, status 
      FROM users 
      ORDER BY created_at
    `);

    console.log('\nAll users:');
    verify.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}): ${user.status}`);
    });

    console.log('\n✅ All done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateStatuses();
