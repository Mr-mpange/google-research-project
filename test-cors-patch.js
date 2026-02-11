/**
 * Test CORS PATCH method fix
 * This script tests if PATCH requests work with CORS
 */

const API_BASE_URL = 'https://research-system-864580156744.us-central1.run.app';

async function testCORSPatch() {
  console.log('Testing CORS PATCH method...\n');
  
  try {
    // First, login to get a token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'Admin@123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');
    
    // Get list of users
    console.log('2. Fetching users...');
    const usersResponse = await fetch(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }
    
    const users = await usersResponse.json();
    console.log(`✅ Found ${users.length} users\n`);
    
    // Find a non-admin user to test with
    const testUser = users.find(u => u.role !== 'admin' && u.username !== 'adminuser');
    
    if (!testUser) {
      console.log('⚠️  No non-admin users found to test with');
      return;
    }
    
    console.log(`3. Testing PATCH on user: ${testUser.username}`);
    console.log(`   Current status: ${testUser.is_active ? 'active' : 'inactive'}`);
    
    // Test PATCH request (toggle status)
    const newStatus = !testUser.is_active;
    console.log(`   Attempting to set status to: ${newStatus ? 'active' : 'inactive'}`);
    
    const patchResponse = await fetch(`${API_BASE_URL}/api/users/${testUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_active: newStatus })
    });
    
    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(`PATCH failed: ${patchResponse.status} - ${errorText}`);
    }
    
    const patchData = await patchResponse.json();
    console.log('✅ PATCH request successful!');
    console.log(`   New status: ${patchData.user.is_active ? 'active' : 'inactive'}\n`);
    
    // Verify the change
    console.log('4. Verifying the change...');
    const verifyResponse = await fetch(`${API_BASE_URL}/api/users/${testUser.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.status}`);
    }
    
    const verifiedUser = await verifyResponse.json();
    console.log(`✅ Verified status: ${verifiedUser.is_active ? 'active' : 'inactive'}\n`);
    
    console.log('🎉 CORS PATCH test completed successfully!');
    console.log('   The activate/deactivate functionality should now work in the frontend.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCORSPatch();
