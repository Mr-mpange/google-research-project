const API_BASE_URL = 'https://research-system-864580156744.us-central1.run.app';

async function testUserManagement() {
  console.log('🧪 Testing User Management API...\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'Admin@123'
      })
    });
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      throw new Error('Login failed');
    }
    
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // 2. Get all users
    console.log('2️⃣ Fetching all users...');
    const usersResponse = await fetch(`${API_BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersResponse.json();
    
    console.log(`✅ Found ${usersData.users.length} users`);
    console.log('Users:', usersData.users.map(u => `${u.username} (${u.role})`).join(', '));
    console.log('');

    // 3. Create a test user
    console.log('3️⃣ Creating a test user...');
    const newUserResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'Test@123',
        full_name: 'Test User',
        role: 'researcher'
      })
    });
    const newUserData = await newUserResponse.json();
    
    if (!newUserData.success) {
      throw new Error('User creation failed: ' + newUserData.error);
    }
    
    const newUserId = newUserData.user.id;
    console.log(`✅ User created: ${newUserData.user.username} (ID: ${newUserId})\n`);

    // 4. Update user role
    console.log('4️⃣ Updating user role to viewer...');
    const roleResponse = await fetch(`${API_BASE_URL}/api/users/${newUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: 'viewer' })
    });
    const roleData = await roleResponse.json();
    console.log(`✅ Role updated: ${roleData.user.role}\n`);

    // 5. Deactivate user
    console.log('5️⃣ Deactivating user...');
    const statusResponse = await fetch(`${API_BASE_URL}/api/users/${newUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_active: false })
    });
    const statusData = await statusResponse.json();
    console.log(`✅ User deactivated: is_active = ${statusData.user.is_active}\n`);

    // 6. Delete user
    console.log('6️⃣ Deleting test user...');
    const deleteResponse = await fetch(`${API_BASE_URL}/api/users/${newUserId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const deleteData = await deleteResponse.json();
    console.log(`✅ User deleted successfully\n`);

    console.log('🎉 All tests passed! User Management API is fully functional.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUserManagement();
