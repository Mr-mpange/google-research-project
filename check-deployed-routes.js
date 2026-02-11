/**
 * Check which routes are actually deployed on Cloud Run
 */

const API_URL = 'https://research-system-864580156744.us-central1.run.app';

async function checkRoute(method, path, headers = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    return { status, data, exists: status !== 404 };
  } catch (error) {
    return { status: 'ERROR', data: error.message, exists: false };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     CHECKING DEPLOYED ROUTES ON CLOUD RUN                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // First, login to get admin token
  console.log('1. Getting admin token...');
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'adminuser',
      password: 'Admin@123'
    })
  });

  const loginData = await loginResponse.json();
  const adminToken = loginData.token;

  if (!adminToken) {
    console.error('❌ Failed to get admin token');
    process.exit(1);
  }

  console.log('✅ Admin token obtained\n');

  // Check routes
  const routes = [
    { method: 'GET', path: '/health', name: 'Health Check', auth: false },
    { method: 'POST', path: '/auth/login', name: 'Auth Login', auth: false },
    { method: 'POST', path: '/auth/register', name: 'Auth Register', auth: false },
    { method: 'GET', path: '/api/users', name: 'Get All Users', auth: true },
    { method: 'GET', path: '/api/users/pending/list', name: 'Get Pending Users (NEW)', auth: true },
    { method: 'POST', path: '/api/users/test-id/approve', name: 'Approve User (NEW)', auth: true },
    { method: 'POST', path: '/api/users/test-id/reject', name: 'Reject User (NEW)', auth: true },
    { method: 'GET', path: '/api/migration/status', name: 'Migration Status (NEW)', auth: true },
    { method: 'POST', path: '/api/migration/run-approval-system', name: 'Run Migration (NEW)', auth: true },
    { method: 'POST', path: '/api/migration/fix-user-statuses', name: 'Fix User Statuses (NEW)', auth: true },
    { method: 'GET', path: '/api/questions', name: 'Get Questions', auth: true },
    { method: 'DELETE', path: '/api/cache/questions', name: 'Clear Cache', auth: true },
  ];

  console.log('Checking routes...\n');
  console.log('─'.repeat(80));

  for (const route of routes) {
    const headers = route.auth ? { 'Authorization': `Bearer ${adminToken}` } : {};
    const result = await checkRoute(route.method, route.path, headers);
    
    const statusColor = result.exists ? '✅' : '❌';
    const statusText = result.status === 404 ? '404 NOT FOUND' : 
                       result.status === 401 ? '401 UNAUTHORIZED' :
                       result.status === 403 ? '403 FORBIDDEN' :
                       result.status === 200 ? '200 OK' :
                       result.status === 201 ? '201 CREATED' :
                       result.status;
    
    console.log(`${statusColor} ${route.method.padEnd(6)} ${route.path.padEnd(40)} ${statusText}`);
    
    if (route.name.includes('(NEW)') && !result.exists) {
      console.log(`   ⚠️  ${route.name} - NOT DEPLOYED`);
    }
  }

  console.log('─'.repeat(80));

  // Check version
  console.log('\n2. Checking deployed version...');
  const healthResponse = await fetch(`${API_URL}/health`);
  const healthData = await healthResponse.json();
  console.log(`   Version: ${healthData.version}`);
  console.log(`   Status: ${healthData.status}`);
  console.log(`   Redis: ${healthData.services.redis}`);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const newRoutes = routes.filter(r => r.name.includes('(NEW)'));
  const deployedNewRoutes = [];
  
  for (const route of newRoutes) {
    const headers = route.auth ? { 'Authorization': `Bearer ${adminToken}` } : {};
    const result = await checkRoute(route.method, route.path, headers);
    if (result.exists) {
      deployedNewRoutes.push(route.name);
    }
  }

  console.log(`Total new routes: ${newRoutes.length}`);
  console.log(`Deployed: ${deployedNewRoutes.length}`);
  console.log(`Missing: ${newRoutes.length - deployedNewRoutes.length}`);

  if (deployedNewRoutes.length === newRoutes.length) {
    console.log('\n✅ ALL NEW ROUTES ARE DEPLOYED!');
  } else {
    console.log('\n❌ SOME ROUTES ARE MISSING');
    console.log('\nMissing routes:');
    newRoutes.forEach(route => {
      const headers = route.auth ? { 'Authorization': `Bearer ${adminToken}` } : {};
      checkRoute(route.method, route.path, headers).then(result => {
        if (!result.exists) {
          console.log(`  - ${route.name}`);
        }
      });
    });
  }

  console.log('\n');
}

main();
