/**
 * Test script for Approval System API
 * Tests all new approval endpoints
 */

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test data
let adminToken = '';
let newUserId = '';
const testUsername = `testresearcher_${Date.now()}`;
const testEmail = `test_${Date.now()}@example.com`;

async function makeRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  logInfo(`Request: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    logInfo(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    throw error;
  }
}

async function test1_AdminLogin() {
  logTest('1. Admin Login');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'adminuser',
      password: 'Admin@123'
    })
  });
  
  if (result.status === 200 && result.data.token) {
    adminToken = result.data.token;
    logSuccess('Admin login successful');
    logInfo(`Token: ${adminToken.substring(0, 20)}...`);
    return true;
  } else {
    logError('Admin login failed');
    return false;
  }
}

async function test2_RegisterNewResearcher() {
  logTest('2. Register New Researcher (Should be Pending)');
  
  const result = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: 'Test@123',
      full_name: 'Test Researcher',
      role: 'researcher'
    })
  });
  
  if (result.status === 201 && result.data.user) {
    newUserId = result.data.user.id;
    const status = result.data.user.status;
    const requiresApproval = result.data.requiresApproval;
    
    if (status === 'pending' && requiresApproval === true) {
      logSuccess('Researcher registered with pending status');
      logInfo(`User ID: ${newUserId}`);
      return true;
    } else {
      logError(`Expected status='pending' and requiresApproval=true, got status='${status}' and requiresApproval=${requiresApproval}`);
      return false;
    }
  } else {
    logError('Registration failed');
    return false;
  }
}

async function test3_LoginWithPendingAccount() {
  logTest('3. Try Login with Pending Account (Should Fail)');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      password: 'Test@123'
    })
  });
  
  if (result.status === 403 && result.data.error === 'Account pending approval') {
    logSuccess('Login correctly blocked for pending account');
    return true;
  } else {
    logError(`Expected 403 with 'Account pending approval', got ${result.status}`);
    return false;
  }
}

async function test4_GetPendingUsers() {
  logTest('4. Get Pending Users (As Admin)');
  
  const result = await makeRequest('/api/users/pending/list', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  if (result.status === 200 && result.data.users) {
    const pendingUser = result.data.users.find(u => u.id === newUserId);
    
    if (pendingUser) {
      logSuccess(`Found pending user: ${pendingUser.username}`);
      logInfo(`Total pending users: ${result.data.count}`);
      return true;
    } else {
      logError('New user not found in pending list');
      return false;
    }
  } else {
    logError('Failed to get pending users');
    return false;
  }
}

async function test5_ApproveUser() {
  logTest('5. Approve User (As Admin)');
  
  const result = await makeRequest(`/api/users/${newUserId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  if (result.status === 200 && result.data.user.status === 'active') {
    logSuccess('User approved successfully');
    logInfo(`User status: ${result.data.user.status}`);
    return true;
  } else {
    logError('Failed to approve user');
    return false;
  }
}

async function test6_LoginAfterApproval() {
  logTest('6. Login After Approval (Should Work)');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      password: 'Test@123'
    })
  });
  
  if (result.status === 200 && result.data.token) {
    logSuccess('Login successful after approval');
    logInfo(`User token: ${result.data.token.substring(0, 20)}...`);
    return true;
  } else {
    logError('Login failed after approval');
    return false;
  }
}

async function test7_GetAllUsers() {
  logTest('7. Get All Users (Should Show Status)');
  
  const result = await makeRequest('/api/users', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  if (result.status === 200 && result.data.users) {
    const hasStatus = result.data.users.every(u => u.status !== undefined);
    
    if (hasStatus) {
      logSuccess('All users have status field');
      logInfo(`Total users: ${result.data.users.length}`);
      
      // Show status breakdown
      const statusCounts = result.data.users.reduce((acc, u) => {
        acc[u.status] = (acc[u.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nStatus breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      return true;
    } else {
      logError('Some users missing status field');
      return false;
    }
  } else {
    logError('Failed to get users');
    return false;
  }
}

async function test8_RejectUser() {
  logTest('8. Test Reject User (Create and Reject)');
  
  // Register another test user
  const rejectUsername = `reject_${Date.now()}`;
  const rejectEmail = `reject_${Date.now()}@example.com`;
  
  logInfo('Registering user to reject...');
  const registerResult = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: rejectUsername,
      email: rejectEmail,
      password: 'Test@123',
      full_name: 'User To Reject',
      role: 'researcher'
    })
  });
  
  if (registerResult.status !== 201) {
    logError('Failed to register user for rejection test');
    return false;
  }
  
  const rejectUserId = registerResult.data.user.id;
  logInfo(`User to reject ID: ${rejectUserId}`);
  
  // Reject the user
  logInfo('Rejecting user...');
  const rejectResult = await makeRequest(`/api/users/${rejectUserId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      reason: 'Test rejection - does not meet requirements'
    })
  });
  
  if (rejectResult.status === 200 && rejectResult.data.user.status === 'rejected') {
    logSuccess('User rejected successfully');
    
    // Try to login with rejected account
    logInfo('Trying to login with rejected account...');
    const loginResult = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: rejectUsername,
        password: 'Test@123'
      })
    });
    
    if (loginResult.status === 403 && loginResult.data.error === 'Account rejected') {
      logSuccess('Login correctly blocked for rejected account');
      return true;
    } else {
      logError('Rejected user was able to login');
      return false;
    }
  } else {
    logError('Failed to reject user');
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        APPROVAL SYSTEM API TEST SUITE                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  const tests = [
    { name: 'Admin Login', fn: test1_AdminLogin },
    { name: 'Register New Researcher', fn: test2_RegisterNewResearcher },
    { name: 'Login with Pending Account', fn: test3_LoginWithPendingAccount },
    { name: 'Get Pending Users', fn: test4_GetPendingUsers },
    { name: 'Approve User', fn: test5_ApproveUser },
    { name: 'Login After Approval', fn: test6_LoginAfterApproval },
    { name: 'Get All Users', fn: test7_GetAllUsers },
    { name: 'Reject User', fn: test8_RejectUser }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      logError(`Test failed with error: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST SUMMARY                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log('\n');
  if (passedCount === totalCount) {
    log(`✅ ALL TESTS PASSED (${passedCount}/${totalCount})`, 'green');
  } else {
    log(`⚠️  SOME TESTS FAILED (${passedCount}/${totalCount} passed)`, 'yellow');
  }
  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});
