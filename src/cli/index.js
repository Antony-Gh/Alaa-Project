#!/usr/bin/env node

const { Command } = require('commander');
const migrationManager = require('../core/migrations/migrationManager');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');

const program = new Command();

program
  .name('scheduling-cli')
  .description('CLI tools for the scheduling system')
  .version('1.0.0');

// Migration commands
const migrationCmd = program
  .command('migration')
  .alias('migrate')
  .description('Database migration commands');

migrationCmd
  .command('run')
  .description('Run pending migrations')
  .action(async () => {
    try {
      await dbManager.initialize();
      await migrationManager.initialize();
      await migrationManager.migrate();
      console.log('✅ Migrations completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  });

migrationCmd
  .command('rollback [version]')
  .description('Rollback migrations to specific version')
  .action(async version => {
    try {
      await dbManager.initialize();
      await migrationManager.initialize();
      await migrationManager.rollback(version);
      console.log('✅ Rollback completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  });

migrationCmd
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      await dbManager.initialize();
      await migrationManager.initialize();
      const status = await migrationManager.getStatus();

      console.log('\n📋 Migration Status:');
      console.log('==================');

      status.forEach(migration => {
        const status = migration.executed ? '✅' : '⏳';
        console.log(`${status} ${migration.version} - ${migration.name}`);
      });

      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to get migration status:', error.message);
      process.exit(1);
    }
  });

migrationCmd
  .command('generate <name>')
  .description('Generate new migration file')
  .action(async name => {
    try {
      const filename = await migrationManager.generateMigration(name);
      console.log(`✅ Migration file created: ${filename}`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to generate migration:', error.message);
      process.exit(1);
    }
  });

// Cache commands
const cacheCmd = program
  .command('cache')
  .description('Cache management commands');

cacheCmd
  .command('clear')
  .description('Clear all cache')
  .action(async () => {
    try {
      const cacheService = require('../services/cacheService');
      await cacheService.flush();
      console.log('✅ Cache cleared successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      process.exit(1);
    }
  });

cacheCmd
  .command('stats')
  .description('Show cache statistics')
  .action(async () => {
    try {
      const cacheService = require('../services/cacheService');
      const stats = await cacheService.getStats();
      console.log('\n📊 Cache Statistics:');
      console.log('==================');
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error.message);
      process.exit(1);
    }
  });

// Health check command
program
  .command('health')
  .description('Run health checks')
  .action(async () => {
    try {
      const healthCheck = require('../core/monitoring/healthCheck');
      const health = await healthCheck.runAll();

      console.log('\n🏥 Health Check Results:');
      console.log('=======================');
      console.log(`Overall Status: ${health.status.toUpperCase()}`);
      console.log(`Response Time: ${health.responseTime}ms`);
      console.log(`Timestamp: ${health.timestamp}`);

      console.log('\nDetailed Results:');
      Object.entries(health.checks).forEach(([name, result]) => {
        const status = result.status === 'healthy' ? '✅' : '❌';
        console.log(
          `${status} ${name}: ${result.status} (${result.responseTime}ms)`
        );
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });

      process.exit(health.status === 'healthy' ? 0 : 1);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  });

// User management commands
const userCmd = program.command('user').description('User management commands');

userCmd
  .command('create')
  .description('Create admin user')
  .requiredOption('-u, --username <username>', 'Username')
  .requiredOption('-e, --email <email>', 'Email')
  .requiredOption('-p, --password <password>', 'Password')
  .option('-r, --role <role>', 'User role', 'admin')
  .action(async options => {
    try {
      await dbManager.initialize();
      const UserService = require('../services/userService');

      const user = await UserService.createUser({
        username: options.username,
        email: options.email,
        password: options.password,
        role: options.role,
        full_name: options.username,
      });

      console.log('✅ User created successfully:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);

      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to create user:', error.message);
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('Create database backup')
  .option('-o, --output <path>', 'Output file path')
  .action(async options => {
    try {
      const backupService = require('../utils/backup');
      const backupPath = await backupService.createBackup(options.output);
      console.log(`✅ Backup created: ${backupPath}`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
