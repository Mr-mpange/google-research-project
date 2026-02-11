/**
 * Test login with reset credentials
 */

const API_BASE_URL = 'https://research-system-864580156744.us-central1.run.app';

async function testLogin() {
  console.log('Testing login with reset credentials...\n');
  
  const credentials = {
    username: 'adminuser',
    password: 'Admin@123'
  };
  
  try {
    console.log('Attempting login...');
    console.log('Username:', credentials.username);
    console.log('Password:', credentials.password);
    console.log('');
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });
    
    console.log('Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ LOGIN SUCCESSFUL!\n');
      console.log('User Info:');
      console.log('  ID:', data.user.id);
      console.log('  Username:', data.user.username);
      console.log('  Email:', data.user.email);
      console.log('  Role:', data.user.role);
      console.log('  Status:', data.user.status);
      console.log('  Active:', data.user.is_active);
      console.log('\nToken:', data.token.substring(0, 50) + '...');
      console.log('\n========================================');
      console.log('YOU CAN NOW LOG IN TO THE FRONTEND!');
      console.log('========================================');
      console.log('URL: http://localhost:8080/auth');
      console.log('Username: adminuser');
      console.log('Password: Admin@123');
      console.log('========================================\n');
    } else {
      console.log('\n❌ LOGIN FAILED\n');
      console.log('Error:', data.error || data.message);
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

testLogin();
