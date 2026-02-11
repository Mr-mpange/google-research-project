/**
 * Test CORS OPTIONS preflight for PATCH method
 */

const https = require('https');

const API_BASE_URL = 'https://research-system-864580156744.us-central1.run.app';

function testCORSOptions() {
  console.log('Testing CORS OPTIONS preflight for PATCH method...\n');
  
  const options = {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:8080',
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'content-type,authorization'
    }
  };
  
  const url = new URL(`${API_BASE_URL}/api/users/test-id/status`);
  
  const req = https.request(url, options, (res) => {
    console.log('Response Status:', res.statusCode);
    console.log('\nResponse Headers:');
    console.log('------------------');
    
    const corsHeaders = {
      'access-control-allow-origin': res.headers['access-control-allow-origin'],
      'access-control-allow-methods': res.headers['access-control-allow-methods'],
      'access-control-allow-headers': res.headers['access-control-allow-headers'],
      'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
      'access-control-max-age': res.headers['access-control-max-age']
    };
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        console.log(`${key}: ${value}`);
      }
    });
    
    console.log('\n------------------');
    
    // Check if PATCH is allowed
    const allowedMethods = res.headers['access-control-allow-methods'];
    if (allowedMethods && allowedMethods.includes('PATCH')) {
      console.log('✅ PATCH method is allowed!');
      console.log('✅ CORS configuration is correct.');
      console.log('\nThe activate/deactivate functionality should now work in the frontend.');
    } else {
      console.log('❌ PATCH method is NOT allowed!');
      console.log(`   Allowed methods: ${allowedMethods || 'none'}`);
      console.log('\n⚠️  CORS configuration needs to be updated.');
    }
  });
  
  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });
  
  req.end();
}

testCORSOptions();
