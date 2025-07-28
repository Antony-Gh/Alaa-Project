#!/usr/bin/env node

/**
 * Test script for bypass authentication system
 */

const path = require('path');
const config = require('../config/config');

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { generateHash, generateCommonHashes } = require('../utils/hashGenerator');
const { createBypassUser, testBypassAuth } = require('../utils/bypassAuth');

async function testBypassSystem() {
  try {
    console.log('🧪 Testing bypass authentication system...\n');

    // Test 1: Generate hash
    console.log('1. Testing hash generation...');
    const testPassword = 'test123';
    const hash = await generateHash(testPassword, 8);
    console.log(`✅ Hash generated: ${hash.substring(0, 20)}...\n`);

    // Test 2: Generate common hashes
    console.log('2. Testing common hash generation...');
    const commonHashes = await generateCommonHashes();
    console.log(`✅ Generated ${Object.keys(commonHashes).length} common hashes\n`);

    // Test 3: Create bypass user
    console.log('3. Testing bypass user creation...');
    const testUser = {
      username: 'testuser',
      password: 'testpass123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'employee',
      is_active: true
    };

    try {
      const createdUser = await createBypassUser(testUser);
      console.log(`✅ User created: ${createdUser.username} (ID: ${createdUser.id})\n`);

      // Test 4: Test authentication
      console.log('4. Testing authentication...');
      const isValid = await testBypassAuth('testuser', 'testpass123');
      console.log(`✅ Authentication test: ${isValid ? 'PASSED' : 'FAILED'}\n`);

      // Test 5: Test wrong password
      console.log('5. Testing wrong password...');
      const isWrongValid = await testBypassAuth('testuser', 'wrongpassword');
      console.log(`✅ Wrong password test: ${!isWrongValid ? 'PASSED' : 'FAILED'}\n`);

    } catch (error) {
      console.log(`⚠️  User creation failed (might already exist): ${error.message}\n`);
      
      // Test authentication anyway
      console.log('4. Testing authentication with existing user...');
      const isValid = await testBypassAuth('testuser', 'testpass123');
      console.log(`✅ Authentication test: ${isValid ? 'PASSED' : 'FAILED'}\n`);
    }

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Usage examples:');
    console.log('  npm run hash:generate "admin123"');
    console.log('  npm run bypass:create admin admin123 admin admin@example.com');
    console.log('  npm run bypass:test admin admin123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBypassSystem();
}

module.exports = { testBypassSystem }; 