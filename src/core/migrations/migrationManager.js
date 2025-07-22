const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const dbManager = require('../../utils/database');

/**
 * Advanced migration manager with rollback support
 */
class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationTable = 'schema_migrations';
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    await this.createMigrationTable();
    logger.info('Migration system initialized');
  }

  /**
   * Create migration tracking table
   */
  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        checksum TEXT
      )
    `;
    await dbManager.run(query);
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    logger.info('All migrations completed successfully');
  }

  /**
   * Rollback to specific version
   */
  async rollback(targetVersion = null) {
    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    let migrationsToRollback;

    if (targetVersion) {
      const targetIndex = executedMigrations.findIndex(
        m => m.version === targetVersion
      );
      if (targetIndex === -1) {
        throw new Error(`Migration version ${targetVersion} not found`);
      }
      migrationsToRollback = executedMigrations
        .slice(0, targetIndex + 1)
        .reverse();
    } else {
      // Rollback last migration only
      migrationsToRollback = [executedMigrations[0]];
    }

    logger.info(`Rolling back ${migrationsToRollback.length} migrations`);

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    logger.info('Rollback completed successfully');
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations() {
    const allMigrations = await this.getAllMigrationFiles();
    const executedVersions = await this.getExecutedVersions();

    return allMigrations.filter(
      migration => !executedVersions.includes(migration.version)
    );
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    const query = `
      SELECT * FROM ${this.migrationTable} 
      ORDER BY executed_at DESC
    `;
    return await dbManager.query(query);
  }

  /**
   * Get executed migration versions
   */
  async getExecutedVersions() {
    const migrations = await this.getExecutedMigrations();
    return migrations.map(m => m.version);
  }

  /**
   * Get all migration files
   */
  async getAllMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => {
          const version = file.split('_')[0];
          const name = file.replace('.js', '').substring(version.length + 1);
          return { version, name, filename: file };
        });

      return migrationFiles;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('Migrations directory not found, creating it');
        await fs.mkdir(this.migrationsPath, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  /**
   * Execute a migration
   */
  async executeMigration(migration) {
    const startTime = Date.now();

    try {
      logger.info(
        `Executing migration: ${migration.version}_${migration.name}`
      );

      const migrationModule = require(
        path.join(this.migrationsPath, migration.filename)
      );

      if (typeof migrationModule.up !== 'function') {
        throw new Error(
          `Migration ${migration.filename} missing 'up' function`
        );
      }

      // Execute migration in transaction
      await dbManager.transaction(async () => {
        await migrationModule.up(dbManager);

        const executionTime = Date.now() - startTime;
        const checksum = await this.calculateChecksum(migration.filename);

        // Record migration execution
        await dbManager.run(
          `
          INSERT INTO ${this.migrationTable} (version, name, execution_time, checksum)
          VALUES (?, ?, ?, ?)
        `,
          [migration.version, migration.name, executionTime, checksum]
        );
      });

      logger.info(
        `Migration ${migration.version} completed in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      logger.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration) {
    try {
      logger.info(
        `Rolling back migration: ${migration.version}_${migration.name}`
      );

      const migrationModule = require(
        path.join(
          this.migrationsPath,
          `${migration.version}_${migration.name}.js`
        )
      );

      if (typeof migrationModule.down !== 'function') {
        throw new Error(
          `Migration ${migration.version} missing 'down' function`
        );
      }

      // Execute rollback in transaction
      await dbManager.transaction(async () => {
        await migrationModule.down(dbManager);

        // Remove migration record
        await dbManager.run(
          `
          DELETE FROM ${this.migrationTable} WHERE version = ?
        `,
          [migration.version]
        );
      });

      logger.info(`Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      logger.error(`Rollback of migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filename) {
    const crypto = require('crypto');
    const content = await fs.readFile(
      path.join(this.migrationsPath, filename),
      'utf8'
    );
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate new migration file
   */
  async generateMigration(name) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .split('.')[0];
    const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.js`;
    const filepath = path.join(this.migrationsPath, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Run the migration
   * @param {Object} db - Database manager instance
   */
  async up(db) {
    // Add your migration code here
    // Example:
    // await db.run(\`
    //   CREATE TABLE example (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     name TEXT NOT NULL,
    //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    //   )
    // \`);
  },

  /**
   * Rollback the migration
   * @param {Object} db - Database manager instance
   */
  async down(db) {
    // Add your rollback code here
    // Example:
    // await db.run('DROP TABLE IF EXISTS example');
  }
};
`;

    await fs.mkdir(this.migrationsPath, { recursive: true });
    await fs.writeFile(filepath, template);

    logger.info(`Migration file created: ${filename}`);
    return filename;
  }

  /**
   * Get migration status
   */
  async getStatus() {
    const allMigrations = await this.getAllMigrationFiles();
    const executedVersions = await this.getExecutedVersions();

    return allMigrations.map(migration => ({
      ...migration,
      executed: executedVersions.includes(migration.version),
    }));
  }
}

module.exports = new MigrationManager();
