/**
 * Verify password hash matches
 */

const bcrypt = require('bcryptjs');

async function verifyHash() {
  const password = 'Admin@123';
  const hashFromDB = '$2a$10$5MFDg.ANENKeAAEnZ9cKoO0RkZpLAA97WSaP4wmbmB0y29PfUcP7C';
  
  console.log('Testing password verification...\n');
  console.log('Password:', password);
  console.log('Hash:', hashFromDB);
  console.log('');
  
  const isValid = await bcrypt.compare(password, hashFromDB);
  
  console.log('Result:', isValid ? '✅ MATCH' : '❌ NO MATCH');
  
  if (!isValid) {
    console.log('\nGenerating new hash...');
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
    
    console.log('\nTesting new hash...');
    const isNewValid = await bcrypt.compare(password, newHash);
    console.log('New hash result:', isNewValid ? '✅ MATCH' : '❌ NO MATCH');
  }
}

verifyHash();
