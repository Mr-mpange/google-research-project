/**
 * Fix user statuses and test approval system
 */

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     FIX USER STATUSES & TEST APPROVAL SYSTEM               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Login as admin
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

    // Fix user statuses
    console.log('2. Fixing user statuses (setting all to active)...');
    const fixResponse = await fetch(`${API_URL}/api/migration/fix-user-statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const fixData = await fixResponse.json();
    console.log('Fix result:', JSON.stringify(fixData, null, 2));

    if (fixData.success) {
      console.log(`✅ Fixed ${fixData.users.length} users\n`);
    } else {
      console.log('❌ Failed to fix user statuses\n');
    }

    // Verify users now have status
    console.log('3. Verifying users have status field...');
    const usersResponse = await fetch(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const usersData = await usersResponse.json();

    if (usersData.users && usersData.users.length > 0) {
      const hasStatus = usersData.users.every(u => u.status !== undefined);
      
      if (hasStatus) {
        console.log('✅ All users now have status field');
        
        // Show status breakdown
        const statusCounts = usersData.users.reduce((acc, u) => {
          acc[u.status] = (acc[u.status] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\nUser status distribution:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`  ${status}: ${count} users`);
        });
      } else {
        console.log('❌ Some users still missing status field');
        return;
      }
    }

    // Test new researcher registration
    console.log('\n4. Testing new researcher registration...');
    const testUsername = `test_researcher_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;

    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        full_name: 'Test Researcher',
        role: 'researcher'
      })
    });

    const registerData = await registerResponse.json();
    console.log('Registration result:', JSON.stringify(registerData, null, 2));

    if (registerData.user && registerData.user.status === 'pending') {
      console.log('✅ New researcher registered with pending status');
    } else {
      console.log('⚠️  New researcher did not get pending status');
    }

    // Try to login with pending account
    console.log('\n5. Testing login with pending account...');
    const loginTestResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'Test@123'
      })
    });

    const loginTestData = await loginTestResponse.json();

    if (loginTestResponse.status === 403 && loginTestData.error === 'Account pending approval') {
      console.log('✅ Login correctly blocked for pending account');
    } else {
      console.log('❌ Pending user was able to login');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SUCCESS!                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('✅ Approval system is working correctly!');
    console.log('\nNext steps:');
    console.log('  - Run full test suite: node test-approval-api.js');
    console.log('  - Update frontend to show approval UI\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
