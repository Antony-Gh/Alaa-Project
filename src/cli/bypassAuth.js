#!/usr/bin/env node

/**
 * Authentication Bypass CLI
 * Allows bypassing authentication by creating users with known hashes
 */

const path = require('path');
const config = require('../config/config');

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const {
  createBypassUser,
  updateUserWithBypass,
  createCommonBypassUsers,
  createStrongPasswordUser,
  createMultipleStrongPasswordUsers,
  getAllUsersWithHashes,
  testBypassAuth,
  generateBypassSQL,
} = require('../utils/bypassAuth');

const args = process.argv.slice(2);

async function main() {
  try {
    if (args.length === 0) {
      console.log(`
🔐 Authentication Bypass CLI

Usage:
  node bypassAuth.js create <username> <password> [role] [email]
  node bypassAuth.js update <username> <password>
  node bypassAuth.js common
  node bypassAuth.js strong <username> [role] [email]
  node bypassAuth.js strong-multiple
  node bypassAuth.js list
  node bypassAuth.js test <username> <password>
  node bypassAuth.js sql

Examples:
  node bypassAuth.js create admin admin123 admin admin@example.com
  node bypassAuth.js update admin newpassword123
  node bypassAuth.js common
  node bypassAuth.js strong admin admin admin@example.com
  node bypassAuth.js strong-multiple
  node bypassAuth.js test admin admin123
      `);
      return;
    }

    const command = args[0];

    switch (command) {
      case 'create':
        if (args.length < 3) {
          console.error('❌ Error: Username and password required');
          return;
        }

        const userData = {
          username: args[1],
          password: args[2],
          role: args[3] || 'admin',
          email: args[4] || `${args[1]}@example.com`,
          full_name: args[5] || `${args[1]} User`,
          is_active: true,
        };

        console.log('🔐 Creating bypass user...');
        const newUser = await createBypassUser(userData);

        console.log('\n✅ Bypass user created:');
        console.log('='.repeat(30));
        console.log(`ID: ${newUser.id}`);
        console.log(`Username: ${newUser.username}`);
        console.log(`Role: ${newUser.role}`);
        console.log(`Email: ${newUser.email}`);
        console.log(`Password: ${userData.password}`);
        break;

      case 'update':
        if (args.length < 3) {
          console.error('❌ Error: Username and password required');
          return;
        }

        console.log('🔐 Updating user with bypass hash...');
        const updatedUser = await updateUserWithBypass(args[1], args[2]);

        console.log('\n✅ User updated:');
        console.log('='.repeat(30));
        console.log(`ID: ${updatedUser.id}`);
        console.log(`Username: ${updatedUser.username}`);
        console.log(`Role: ${updatedUser.role}`);
        console.log(`New Password: ${args[2]}`);
        break;

      case 'common':
        console.log('🔐 Creating common bypass users...');
        const createdUsers = await createCommonBypassUsers();

        console.log('\n✅ Common users created:');
        console.log('='.repeat(30));
        for (const user of createdUsers) {
          console.log(`\nUsername: ${user.username}`);
          console.log(`Role: ${user.role}`);
          console.log(`Email: ${user.email}`);
          console.log(`Password: ${user.username}123`);
          console.log('-'.repeat(20));
        }
        break;

      case 'list':
        console.log('🔐 Listing all users with hashes...');
        const users = await getAllUsersWithHashes();

        console.log('\n📋 Users in database:');
        console.log('='.repeat(50));
        for (const user of users) {
          console.log(`\nID: ${user.id}`);
          console.log(`Username: ${user.username}`);
          console.log(`Role: ${user.role}`);
          console.log(`Active: ${user.is_active ? 'Yes' : 'No'}`);
          console.log(`Hash: ${user.password_hash.substring(0, 20)}...`);
          console.log('-'.repeat(30));
        }
        break;

      case 'test':
        if (args.length < 3) {
          console.error('❌ Error: Username and password required');
          return;
        }

        console.log('🔐 Testing authentication...');
        const isValid = await testBypassAuth(args[1], args[2]);

        console.log('\n📋 Authentication test result:');
        console.log('='.repeat(30));
        console.log(`Username: ${args[1]}`);
        console.log(`Password: ${args[2]}`);
        console.log(`Valid: ${isValid ? '✅ Yes' : '❌ No'}`);
        break;

      case 'strong':
        if (args.length < 2) {
          console.error('❌ Error: Username required');
          return;
        }

        const strongUserData = {
          username: args[1],
          role: args[2] || 'admin',
          email: args[3] || `${args[1]}@example.com`,
          full_name: args[4] || `${args[1]} User`,
          is_active: true,
        };

        console.log('🔐 Creating user with strong password...');
        const strongUser = await createStrongPasswordUser(strongUserData);

        const actionText =
          strongUser.action === 'updated' ? 'updated' : 'created';
        console.log(`\n✅ Strong password user ${actionText}:`);
        console.log('='.repeat(40));
        console.log(`ID: ${strongUser.user.id}`);
        console.log(`Username: ${strongUser.user.username}`);
        console.log(`Role: ${strongUser.user.role}`);
        console.log(`Email: ${strongUser.user.email}`);
        console.log(`Password: ${strongUser.password}`);
        console.log(
          `Action: ${strongUser.action === 'updated' ? '🔄 UPDATED' : '➕ CREATED'}`
        );
        console.log(
          `Validation: ${strongUser.validationPassed ? '✅ PASSED' : '❌ FAILED'}`
        );
        break;

      case 'strong-multiple':
        console.log('🔐 Creating multiple users with strong passwords...');
        const strongUsers = [
          {
            username: 'admin',
            role: 'admin',
            email: 'admin@example.com',
            full_name: 'System Admin',
          },
          {
            username: 'manager',
            role: 'manager',
            email: 'manager@example.com',
            full_name: 'Department Manager',
          },
          {
            username: 'moderator',
            role: 'moderator',
            email: 'moderator@example.com',
            full_name: 'System Moderator',
          },
          {
            username: 'employee',
            role: 'employee',
            email: 'employee@example.com',
            full_name: 'Regular Employee',
          },
        ];

        const createdStrongUsers =
          await createMultipleStrongPasswordUsers(strongUsers);

        console.log('\n✅ Strong password users created:');
        console.log('='.repeat(40));
        for (const user of createdStrongUsers) {
          console.log(`\nID: ${user.user.id}`);
          console.log(`\nUsername: ${user.user.username}`);
          console.log(`Role: ${user.user.role}`);
          console.log(`Email: ${user.user.email}`);
          console.log(`Password: ${user.password}`);
          console.log(`Full Name: ${user.user.full_name}`);
          console.log(
            `Action: ${user.action === 'updated' ? '🔄 UPDATED' : '➕ CREATED'}`
          );
          console.log(
            `Validation: ${user.validationPassed ? '✅ PASSED' : '❌ FAILED'}`
          );
          console.log('-'.repeat(30));
        }
        break;

      case 'sql':
        console.log('🔐 Generating SQL statements...');
        const sql = await generateBypassSQL();

        console.log('\n📋 SQL Statements:');
        console.log('='.repeat(30));
        console.log(sql);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}

module.exports = { main };
