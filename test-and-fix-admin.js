const https = require('https');

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

console.log('\n=== Admin User Check & Test ===\n');

// Test 1: Check if backend is healthy
function testHealth() {
  return new Promise((resolve, reject) => {
    console.log('1. Testing backend health...');
    
    https.get(`${API_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('   ✅ Backend is healthy');
          console.log('   Status:', parsed.status);
          console.log('   Redis:', parsed.services?.redis || 'N/A');
          resolve(true);
        } catch (e) {
          console.log('   ❌ Backend health check failed');
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Test 2: Try to login with default credentials
function testLogin(username, password) {
  return new Promise((resolve) => {
    console.log(`\n2. Testing login with username: ${username}...`);
    
    const data = JSON.stringify({ username, password });
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
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 200 && parsed.success) {
            console.log('   ✅ Login successful!');
            console.log('   User:', parsed.user.username);
            console.log('   Email:', parsed.user.email);
            console.log('   Role:', parsed.user.role);
            console.log('   Token:', parsed.token.substring(0, 50) + '...');
            resolve({ success: true, user: parsed.user, token: parsed.token });
          } else {
            console.log('   ❌ Login failed');
            console.log('   Status:', res.statusCode);
            console.log('   Error:', parsed.error || responseData);
            resolve({ success: false, error: parsed.error });
          }
        } catch (e) {
          console.log('   ❌ Error parsing response:', e.message);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ❌ Request failed:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

// Test 3: Try to register (to check if user exists)
function testRegister(username, email, password, fullName) {
  return new Promise((resolve) => {
    console.log(`\n3. Checking if user exists (via register attempt)...`);
    
    const data = JSON.stringify({
      username,
      email,
      password,
      full_name: fullName,
      role: 'admin'
    });
    
    const options = {
      hostname: 'research-system-864580156744.us-central1.run.app',
      port: 443,
      path: '/auth/register',
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
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 201) {
            console.log('   ✅ User created successfully!');
            resolve({ exists: false, created: true });
          } else if (res.statusCode === 400 && responseData.includes('already exists')) {
            console.log('   ℹ️  User already exists in database');
            resolve({ exists: true, created: false });
          } else {
            console.log('   ⚠️  Unexpected response:', parsed.error || responseData);
            resolve({ exists: 'unknown', created: false });
          }
        } catch (e) {
          console.log('   ❌ Error:', e.message);
          resolve({ exists: 'unknown', created: false });
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ❌ Request failed:', error.message);
      resolve({ exists: 'unknown', created: false });
    });

    req.write(data);
    req.end();
  });
}

// Test 4: Get public questions (to verify API is working)
function testPublicAPI() {
  return new Promise((resolve) => {
    console.log('\n4. Testing public API endpoints...');
    
    https.get(`${API_URL}/api/questions`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            console.log(`   ✅ API working - Found ${parsed.length} questions`);
            resolve(true);
          } else {
            console.log('   ⚠️  Unexpected response format');
            resolve(false);
          }
        } catch (e) {
          console.log('   ❌ API test failed:', e.message);
          resolve(false);
        }
      });
    }).on('error', () => {
      console.log('   ❌ API request failed');
      resolve(false);
    });
  });
}

// Main test sequence
async function runTests() {
  try {
    // Test 1: Health check
    await testHealth();
    
    // Test 2: Try login with default password
    const loginResult = await testLogin('admin', 'Admin@123');
    
    if (loginResult.success) {
      console.log('\n✅ SUCCESS! Admin user is working correctly!');
      console.log('\n📝 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
      console.log('   Email:', loginResult.user.email);
      console.log('\n🌐 Login URL:');
      console.log('   ' + API_URL + '/auth/login');
      return;
    }
    
    // Test 3: Check if user exists
    const registerResult = await testRegister(
      'admin',
      'admin@research.com',
      'Admin@123',
      'System Administrator'
    );
    
    // Test 4: Test public API
    await testPublicAPI();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (registerResult.exists) {
      console.log('\n❌ ISSUE FOUND:');
      console.log('   Admin user exists but password is incorrect');
      console.log('\n💡 SOLUTION:');
      console.log('   You need to reset the password in the database');
      console.log('\n📋 Run this in Google Cloud Shell:');
      console.log('\n   gcloud sql connect research-db --user=postgres --database=research_system');
      console.log('\n   Then run this SQL:');
      console.log(`
   UPDATE users 
   SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
       role = 'admin',
       is_active = true
   WHERE username = 'admin';
   
   SELECT username, email, role FROM users WHERE username = 'admin';
      `);
      console.log('\n📄 See RESET_ADMIN_PASSWORD.md for detailed instructions');
    } else if (registerResult.created) {
      console.log('\n✅ Admin user created successfully!');
      console.log('   Try logging in now with:');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
    } else {
      console.log('\n⚠️  Unable to determine user status');
      console.log('   Check database connection and migrations');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run all tests
runTests();
