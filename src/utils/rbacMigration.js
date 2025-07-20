const dbManager = require('./database');
const logger = require('./logger');

class RBACMigration {
  constructor() {
    this.db = dbManager;
  }

  async migrate() {
    logger.info('🔄 Starting RBAC migration...');

    try {
      // Check if migration is needed
      const needsMigration = await this.checkMigrationNeeded();

      if (!needsMigration) {
        logger.info('✅ RBAC migration not needed - schema is up to date');
        return;
      }

      // Add new columns to users table
      await this.migrateUsersTable();

      // Update audit_logs table
      await this.migrateAuditLogsTable();

      // Create indexes for better performance
      await this.createRBACIndexes();

      // Update existing data
      await this.migrateExistingData();

      logger.info('✅ RBAC migration completed successfully');
    } catch (error) {
      logger.error('❌ RBAC migration failed:', error);
      throw error;
    }
  }

  async checkMigrationNeeded() {
    try {
      // Check if departments column exists in users table
      const result = await this.db.get(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='users'
      `);

      return !result.sql.includes('departments TEXT');
    } catch (error) {
      logger.warn(
        'Could not check migration status, proceeding with migration'
      );
      return true;
    }
  }

  async migrateUsersTable() {
    logger.info('📝 Migrating users table...');

    // Add departments column
    try {
      await this.db.run(`
        ALTER TABLE users ADD COLUMN departments TEXT DEFAULT '[]'
      `);
      logger.info('✅ Added departments column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
      logger.info('ℹ️ departments column already exists');
    }

    // Add temporary_role column
    try {
      await this.db.run(`
        ALTER TABLE users ADD COLUMN temporary_role TEXT
      `);
      logger.info('✅ Added temporary_role column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
      logger.info('ℹ️ temporary_role column already exists');
    }
  }

  async migrateAuditLogsTable() {
    logger.info('📝 Migrating audit_logs table...');

    // Create new audit_logs table with RBAC structure
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Copy existing data if old table exists
    try {
      const oldTableExists = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='audit_logs'
      `);

      if (oldTableExists) {
        // Copy data from old table to new table
        await this.db.run(`
          INSERT INTO audit_logs_new (id, user_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
          SELECT 
            id,
            user_id,
            action,
            'general' as target_type,
            record_id as target_id,
            json_object('table_name', table_name, 'old_values', old_values, 'new_values', new_values) as details,
            ip_address,
            user_agent,
            created_at
          FROM audit_logs
        `);

        // Drop old table
        await this.db.run('DROP TABLE audit_logs');
        logger.info('✅ Migrated existing audit_logs data');
      }
    } catch (error) {
      logger.warn('Could not migrate existing audit_logs data:', error.message);
    }

    // Rename new table to audit_logs
    await this.db.run('ALTER TABLE audit_logs_new RENAME TO audit_logs');
    logger.info('✅ Updated audit_logs table structure');
  }

  async createRBACIndexes() {
    logger.info('📝 Creating RBAC indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_departments ON users(departments)',
      'CREATE INDEX IF NOT EXISTS idx_users_temporary_role ON users(temporary_role)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id)',
    ];

    for (const index of indexes) {
      await this.db.run(index);
    }

    logger.info('✅ Created RBAC indexes');
  }

  async migrateExistingData() {
    logger.info('📝 Migrating existing data...');

    // Update existing users to have proper department structure
    const users = await this.db.query(
      'SELECT id, department_id FROM users WHERE department_id IS NOT NULL'
    );

    for (const user of users) {
      if (user.department_id) {
        const departments = JSON.stringify([
          { id: user.department_id, role: 'employee' },
        ]);
        await this.db.run('UPDATE users SET departments = ? WHERE id = ?', [
          departments,
          user.id,
        ]);
      }
    }

    logger.info(
      `✅ Migrated ${users.length} users with department assignments`
    );
  }

  async rollback() {
    logger.warn('🔄 Rolling back RBAC migration...');

    try {
      // Remove new columns from users table
      await this.db.run('ALTER TABLE users DROP COLUMN departments');
      await this.db.run('ALTER TABLE users DROP COLUMN temporary_role');

      // Restore original audit_logs table
      await this.db.run('DROP TABLE IF EXISTS audit_logs');
      await this.db.run(`
        CREATE TABLE audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          table_name TEXT,
          record_id TEXT,
          old_values TEXT,
          new_values TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      logger.info('✅ RBAC migration rolled back successfully');
    } catch (error) {
      logger.error('❌ Failed to rollback RBAC migration:', error);
      throw error;
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migration = new RBACMigration();

  migration
    .migrate()
    .then(() => {
      logger.info('🎉 RBAC migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 RBAC migration failed:', error);
      process.exit(1);
    });
}

module.exports = RBACMigration;
