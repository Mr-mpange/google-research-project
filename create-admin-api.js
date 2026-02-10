const https = require('https');

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

// Admin user data
const adminData = {
  username: 'admin',
  email: 'admin@research.com',
  password: 'Admin@123',
  full_name: 'System Administrator',
  role: 'admin'
};

console.log('\n=== Creating Admin User via API ===\n');

// Try to register admin user
const data = JSON.stringify(adminData);

const options = {
  hostname: 'research-system-864580156744.us-central1.run.app',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
    
    try {
      const parsed = JSON.parse(responseData);
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('\n✅ Admin user created successfully!');
        console.log('\n📝 Login credentials:');
        console.log('   Username:', adminData.username);
        console.log('   Password:', adminData.password);
        console.log('   Email:', adminData.email);
        console.log('\n⚠️  Please change the password after first login!');
        console.log('\n🌐 Login at:');
        console.log('   ' + API_URL + '/api/auth/login');
      } else if (res.statusCode === 400 && responseData.includes('already exists')) {
        console.log('\n⚠️  Admin user already exists!');
        console.log('\nTrying to login with existing credentials...\n');
        
        // Try to login
        testLogin();
      } else {
        console.log('\n❌ Failed to create admin user');
        console.log('Error:', parsed.error || responseData);
      }
    } catch (e) {
      console.log('\n❌ Error parsing response:', e.message);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  console.log('\nTrying alternative method...\n');
  
  // If registration fails, try to test if admin already exists
  testLogin();
});

req.write(data);
req.end();

// Function to test login
function testLogin() {
  const loginData = JSON.stringify({
    username: adminData.username,
    password: adminData.password
  });

  const loginOptions = {
    hostname: 'research-system-864580156744.us-central1.run.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginReq = https.request(loginOptions, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        
        if (res.statusCode === 200 && parsed.success) {
          console.log('✅ Admin user exists and login successful!');
          console.log('\n📝 Login credentials:');
          console.log('   Username:', adminData.username);
          console.log('   Password:', adminData.password);
          console.log('   Email:', adminData.email);
          console.log('\nUser details:');
          console.log('   Role:', parsed.user.role);
          console.log('   Active:', parsed.user.is_active);
          
          if (parsed.user.role !== 'admin') {
            console.log('\n⚠️  Warning: User exists but is not an admin!');
            console.log('   Current role:', parsed.user.role);
            console.log('\n   You need to update the user role in the database.');
          }
        } else {
          console.log('❌ Login failed:', parsed.error || responseData);
          console.log('\n💡 You may need to create the admin user via database:');
          console.log('   See CREATE_ADMIN_CLOUD.md for instructions');
        }
      } catch (e) {
        console.log('❌ Error:', e.message);
      }
    });
  });

  loginReq.on('error', (error) => {
    console.error('❌ Login test failed:', error.message);
  });

  loginReq.write(loginData);
  loginReq.end();
}
