const https = require('https');

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

console.log('\n🔍 Verifying Admin User...\n');

function testLogin() {
  const data = JSON.stringify({
    username: 'admin',
    password: 'Admin@123'
  });

  const options = {
    hostname: 'research-system-864580156744.us-central1.run.app',
    port: 443,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', chunk => responseData += chunk);
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('');
      
      try {
        const parsed = JSON.parse(responseData);
        
        if (res.statusCode === 200 && parsed.success) {
          console.log('✅ SUCCESS! Admin login working!\n');
          console.log('═'.repeat(60));
          console.log('USER DETAILS');
          console.log('═'.repeat(60));
          console.log('Username:', parsed.user.username);
          console.log('Email:', parsed.user.email);
          console.log('Full Name:', parsed.user.full_name);
          console.log('Role:', parsed.user.role);
          console.log('Active:', parsed.user.is_active);
          console.log('Created:', parsed.user.created_at);
          console.log('');
          console.log('═'.repeat(60));
          console.log('TOKEN');
          console.log('═'.repeat(60));
          console.log(parsed.token.substring(0, 100) + '...');
          console.log('');
          console.log('═'.repeat(60));
          console.log('LOGIN CREDENTIALS');
          console.log('═'.repeat(60));
          console.log('Username: admin');
          console.log('Password: Admin@123');
          console.log('');
          console.log('🌐 Login URL:');
          console.log(API_URL + '/auth/login');
          console.log('');
          console.log('⚠️  IMPORTANT: Change the password after first login!');
          console.log('');
        } else {
          console.log('❌ LOGIN FAILED\n');
          console.log('Error:', parsed.error || 'Unknown error');
          console.log('');
          console.log('💡 NEXT STEPS:');
          console.log('1. Run the password reset in Google Cloud Shell');
          console.log('2. See FIX_ADMIN_NOW.md for instructions');
          console.log('');
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
        console.log('Raw response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
  });

  req.write(data);
  req.end();
}

testLogin();
