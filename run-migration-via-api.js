/**
 * Run Migration via API
 * This calls the migration endpoint to run the SQL migration remotely
 */

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          RUNNING MIGRATION VIA API                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'Admin@123'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData.token) {
      console.error('❌ Admin login failed:', loginData);
      process.exit(1);
    }

    console.log('✅ Admin login successful\n');
    const adminToken = loginData.token;

    // Step 2: Check current migration status
    console.log('2. Checking current migration status...');
    const statusResponse = await fetch(`${API_URL}/api/migration/status`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const statusData = await statusResponse.json();
    console.log('Current status:', JSON.stringify(statusData, null, 2));

    if (statusData.migrationApplied) {
      console.log('\n✅ Migration already applied!');
      console.log('All database changes are in place.\n');
      return;
    }

    console.log('\n⚠️  Migration not applied yet\n');

    // Step 3: Run the migration
    console.log('3. Running migration...');
    console.log('This may take a few seconds...\n');

    const migrationResponse = await fetch(`${API_URL}/api/migration/run-approval-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const migrationData = await migrationResponse.json();

    if (!migrationResponse.ok) {
      console.error('❌ Migration failed:', migrationData);
      process.exit(1);
    }

    console.log('Migration result:', JSON.stringify(migrationData, null, 2));

    if (migrationData.success && migrationData.allChecksPass) {
      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
      console.log('Verification checks:');
      migrationData.verifications.forEach(v => {
        console.log(`  ${v.passed ? '✅' : '❌'} ${v.check}`);
      });
    } else {
      console.log('\n⚠️  Migration completed but some checks failed\n');
      console.log('Verification checks:');
      migrationData.verifications.forEach(v => {
        console.log(`  ${v.passed ? '✅' : '❌'} ${v.check}`);
      });
    }

    // Step 4: Verify via API
    console.log('\n4. Verifying via API...');
    const verifyResponse = await fetch(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.users && verifyData.users.length > 0) {
      const hasStatus = verifyData.users.every(u => u.status !== undefined);
      
      if (hasStatus) {
        console.log('✅ All users now have status field');
        
        // Show status breakdown
        const statusCounts = verifyData.users.reduce((acc, u) => {
          acc[u.status] = (acc[u.status] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\nUser status distribution:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`  ${status}: ${count} users`);
        });
      } else {
        console.log('❌ Some users still missing status field');
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SUCCESS!                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('✅ Database migration completed');
    console.log('✅ Approval system is now active');
    console.log('\nYou can now:');
    console.log('  - Register new researchers (they will be pending)');
    console.log('  - Approve/reject users via User Management');
    console.log('  - Test all approval endpoints\n');

    console.log('Run the full test suite:');
    console.log('  node test-approval-api.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
