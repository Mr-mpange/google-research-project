/**
 * Generate SQL script to reset admin password
 * Run this locally, then copy the SQL to run on Cloud SQL
 */

const bcrypt = require('bcryptjs');

async function generateResetSQL() {
  const password = 'Admin@123';
  
  console.log('Generating bcrypt hash for password: Admin@123\n');
  
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Generated hash:', hash);
  console.log('\n========================================');
  console.log('SQL SCRIPT TO RUN:');
  console.log('========================================\n');
  
  const sql = `-- Reset admin password to Admin@123
-- Generated on ${new Date().toISOString()}

-- Check current admin users
SELECT username, email, role, status, is_active FROM users WHERE role = 'admin';

-- Update adminuser password
UPDATE users 
SET password_hash = '${hash}',
    status = 'active',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'adminuser';

-- Verify the update
SELECT username, email, role, status, is_active, 
       CASE WHEN password_hash = '${hash}' THEN 'Password Updated' ELSE 'Password NOT Updated' END as password_status
FROM users 
WHERE username = 'adminuser';`;

  console.log(sql);
  console.log('\n========================================');
  console.log('HOW TO USE:');
  console.log('========================================');
  console.log('1. Copy the SQL script above');
  console.log('2. Save it to a file: reset-admin-now.sql');
  console.log('3. Run this command:');
  console.log('   echo "YOUR_SQL_HERE" | gcloud sql connect research-db --user=postgres --database=research_system');
  console.log('\nOR use the generated file:');
  console.log('   Get-Content reset-admin-now.sql | gcloud sql connect research-db --user=postgres --database=research_system --quiet');
  console.log('========================================\n');
  
  // Write to file
  const fs = require('fs');
  fs.writeFileSync('reset-admin-now.sql', sql);
  console.log('✅ SQL script saved to: reset-admin-now.sql\n');
  
  console.log('========================================');
  console.log('NEW CREDENTIALS:');
  console.log('========================================');
  console.log('Username: adminuser');
  console.log('Password: Admin@123');
  console.log('========================================\n');
}

generateResetSQL().catch(console.error);
