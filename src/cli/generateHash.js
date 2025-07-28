#!/usr/bin/env node

/**
 * CLI Hash Generator
 * Generates bcrypt hashes for password bypass
 * 
 * Usage:
 *   node generateHash.js <password> [saltRounds]
 *   node generateHash.js --common
 *   node generateHash.js --admin <password>
 */

const path = require('path');
const config = require('../config/config');

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { 
  generateHash, 
  generateCommonHash, 
  generateAdminHash, 
  generateCommonHashes,
  generateBypassHash 
} = require('../utils/hashGenerator');

const args = process.argv.slice(2);

async function main() {
  try {
    if (args.length === 0) {
      console.log(`
🔐 Hash Generator CLI

Usage:
  node generateHash.js <password> [saltRounds]
  node generateHash.js --common
  node generateHash.js --admin <password>
  node generateHash.js --bypass <password> [type]

Examples:
  node generateHash.js "admin123" 12
  node generateHash.js --common
  node generateHash.js --admin "admin123"
  node generateHash.js --bypass "password123" admin
      `);
      return;
    }

    if (args[0] === '--common') {
      console.log('🔐 Generating common password hashes...');
      const hashes = await generateCommonHashes();
      
      console.log('\n📋 Common Password Hashes:');
      console.log('=' .repeat(50));
      
      for (const [password, hash] of Object.entries(hashes)) {
        console.log(`\nPassword: ${password}`);
        console.log(`Hash: ${hash}`);
        console.log('-'.repeat(30));
      }
      
      return;
    }

    if (args[0] === '--admin') {
      if (args.length < 2) {
        console.error('❌ Error: Password required for admin hash');
        return;
      }
      
      const password = args[1];
      const hash = await generateAdminHash(password);
      
      console.log('\n🔐 Admin Hash Generated:');
      console.log('=' .repeat(30));
      console.log(`Password: ${password}`);
      console.log(`Hash: ${hash}`);
      console.log(`Salt Rounds: 8`);
      
      return;
    }

    if (args[0] === '--bypass') {
      if (args.length < 2) {
        console.error('❌ Error: Password required for bypass hash');
        return;
      }
      
      const password = args[1];
      const type = args[2] || 'normal';
      const hash = await generateBypassHash(password, type);
      
      console.log('\n🔐 Bypass Hash Generated:');
      console.log('=' .repeat(30));
      console.log(`Password: ${password}`);
      console.log(`Type: ${type}`);
      console.log(`Hash: ${hash}`);
      
      return;
    }

    // Default: generate hash with custom salt rounds
    const password = args[0];
    const saltRounds = args[1] ? parseInt(args[1]) : 12;
    
    console.log('🔐 Generating hash...');
    const hash = await generateHash(password, saltRounds);
    
    console.log('\n📋 Hash Generated:');
    console.log('=' .repeat(30));
    console.log(`Password: ${password}`);
    console.log(`Salt Rounds: ${saltRounds}`);
    console.log(`Hash: ${hash}`);
    console.log(`Hash Length: ${hash.length} characters`);

  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}

module.exports = { main }; 