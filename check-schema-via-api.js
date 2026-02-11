/**
 * Check if approval system is working via API
 * This tests if the backend can handle the new approval endpoints
 */

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

async function checkAPI() {
  console.log('\n=== Checking Approval System via API ===\n');

  try {
    // Test 1: Try to register a new researcher
    console.log('1. Testing registration with status field...');
    const testUsername = `schema_test_${Date.now()}`;
    const testEmail = `schema_test_${Date.now()}@test.com`;
    
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        full_name: 'Schema Test User',
        role: 'researcher'
      })
    });

    const registerData = await registerResponse.json();
    console.log('Registration response:', JSON.stringify(registerData, null, 2));

    if (registerResponse.status === 201) {
      if (registerData.user && registerData.user.status) {
        console.log(`✅ Registration works - User status: ${registerData.user.status}`);
        
        if (registerData.user.status === 'pending' && registerData.requiresApproval === true) {
          console.log('✅ Approval system is working correctly!');
          console.log('✅ New researchers are set to pending status');
          return true;
        } else {
          console.log('⚠️  User registered but status is not "pending"');
          console.log('   This might mean the migration was not applied');
          return false;
        }
      } else {
        console.log('❌ User registered but no status field returned');
        console.log('   Migration was NOT applied');
        return false;
      }
    } else if (registerResponse.status === 500) {
      console.log('❌ Server error - likely database schema issue');
      console.log('   Error:', registerData.error);
      console.log('\n   This means the migration was NOT applied!');
      return false;
    } else {
      console.log(`⚠️  Unexpected response: ${registerResponse.status}`);
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function checkAdminLogin() {
  console.log('\n2. Testing admin login...');
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'Admin@123'
      })
    });

    const data = await response.json();

    if (response.status === 200 && data.token) {
      console.log('✅ Admin login successful');
      
      // Try to get users list
      console.log('\n3. Testing GET /api/users endpoint...');
      const usersResponse = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });

      const usersData = await usersResponse.json();

      if (usersResponse.status === 200 && usersData.users) {
        console.log(`✅ Users endpoint works - Found ${usersData.users.length} users`);
        
        // Check if users have status field
        const hasStatus = usersData.users.every(u => u.status !== undefined);
        
        if (hasStatus) {
          console.log('✅ All users have status field');
          
          // Show status breakdown
          const statusCounts = usersData.users.reduce((acc, u) => {
            acc[u.status] = (acc[u.status] || 0) + 1;
            return acc;
          }, {});
          
          console.log('\nStatus distribution:');
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count} users`);
          });
          
          return true;
        } else {
          console.log('❌ Users missing status field - migration NOT applied');
          return false;
        }
      } else {
        console.log('❌ Failed to get users');
        return false;
      }
    } else {
      console.log('❌ Admin login failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     CHECKING APPROVAL SYSTEM DATABASE SCHEMA               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const test1 = await checkAPI();
  const test2 = await checkAdminLogin();

  console.log('\n=== SUMMARY ===\n');

  if (test1 && test2) {
    console.log('✅ DATABASE MIGRATION WAS APPLIED SUCCESSFULLY!');
    console.log('✅ Approval system is ready to use');
    console.log('\nYou can now:');
    console.log('  - Register new researchers (they will be pending)');
    console.log('  - Approve/reject users via API');
    console.log('  - Test all approval endpoints');
  } else {
    console.log('❌ DATABASE MIGRATION WAS NOT APPLIED!');
    console.log('\nYou need to run the SQL migration:');
    console.log('  1. Go to: https://console.cloud.google.com/sql/instances/research-db');
    console.log('  2. Click "Cloud SQL Studio" or connect via Cloud Shell');
    console.log('  3. Run the SQL from: src/database/add-approval-system.sql');
  }

  console.log('\n');
}

main();
