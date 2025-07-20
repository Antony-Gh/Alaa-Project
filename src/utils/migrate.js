const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

class DatabaseMigration {
  constructor() {
    this.db = null;
    this.dbPath = path.resolve(config.database.path);
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, err => {
        if (err) {
          logger.error('❌ Database connection failed', { error: err.message });
          reject(err);
        } else {
          logger.info('✅ Connected to database for migration', {
            path: this.dbPath,
          });
          resolve();
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error('❌ Migration run error', { error: err.message, sql });
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('❌ Migration get error', { error: err.message, sql });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('❌ Migration query error', { error: err.message, sql });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise(resolve => {
      if (this.db) {
        this.db.close(err => {
          if (err) {
            logger.error('❌ Database close error', { error: err.message });
          } else {
            logger.info('✅ Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async migrate() {
    try {
      logger.info('🚀 Starting database migration...');

      // Check if user_id column exists in appointments table
      const tableInfo = await this.query('PRAGMA table_info(appointments)');
      const hasUserId = tableInfo.some(col => col.name === 'user_id');

      if (!hasUserId) {
        logger.info('📝 Adding user_id column to appointments table...');

        // Add user_id column
        await this.run('ALTER TABLE appointments ADD COLUMN user_id INTEGER');

        // Update existing appointments to link to admin user
        const adminUser = await this.get(
          'SELECT id FROM users WHERE role = ? LIMIT 1',
          ['admin']
        );
        if (adminUser) {
          await this.run(
            'UPDATE appointments SET user_id = ? WHERE user_id IS NULL',
            [adminUser.id]
          );
        }

        logger.info('✅ user_id column added successfully');
      }

      // Check if other new columns exist
      const newColumns = [
        { name: 'duration', type: 'INTEGER DEFAULT 60' },
        { name: 'priority', type: 'TEXT DEFAULT "normal"' },
        { name: 'recurring_pattern', type: 'TEXT' },
        { name: 'parent_appointment_id', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
        { name: 'attachments', type: 'TEXT' },
        { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      ];

      for (const column of newColumns) {
        const hasColumn = tableInfo.some(col => col.name === column.name);
        if (!hasColumn) {
          logger.info(
            `📝 Adding ${column.name} column to appointments table...`
          );
          await this.run(
            `ALTER TABLE appointments ADD COLUMN ${column.name} ${column.type}`
          );
        }
      }

      // Check if new tables exist
      const tables = await this.query(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNames = tables.map(t => t.name);

      // Create recurring_appointments table if it doesn't exist
      if (!tableNames.includes('recurring_appointments')) {
        logger.info('📝 Creating recurring_appointments table...');
        await this.run(`
                    CREATE TABLE recurring_appointments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        appointment_id TEXT NOT NULL,
                        pattern_type TEXT NOT NULL,
                        interval INTEGER DEFAULT 1,
                        days_of_week TEXT,
                        start_date TEXT NOT NULL,
                        end_date TEXT,
                        max_occurrences INTEGER,
                        current_occurrence INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
                    )
                `);
      }

      // Create audit_logs table if it doesn't exist
      if (!tableNames.includes('audit_logs')) {
        logger.info('📝 Creating audit_logs table...');
        await this.run(`
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
      }

      // Create analytics table if it doesn't exist
      if (!tableNames.includes('analytics')) {
        logger.info('📝 Creating analytics table...');
        await this.run(`
                    CREATE TABLE analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        metric_value REAL,
                        metric_data TEXT,
                        date DATE NOT NULL,
                        hour INTEGER,
                        department_id INTEGER,
                        location_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (department_id) REFERENCES departments (id),
                        FOREIGN KEY (location_id) REFERENCES locations (id)
                    )
                `);
      }

      // Create notifications table if it doesn't exist
      if (!tableNames.includes('notifications')) {
        logger.info('📝 Creating notifications table...');
        await this.run(`
                    CREATE TABLE notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        data TEXT,
                        is_read BOOLEAN DEFAULT 0,
                        read_at DATETIME,
                        sent_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);
      }

      // Create user_sessions table if it doesn't exist
      if (!tableNames.includes('user_sessions')) {
        logger.info('📝 Creating user_sessions table...');
        await this.run(`
                    CREATE TABLE user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        session_token TEXT UNIQUE NOT NULL,
                        refresh_token TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        expires_at DATETIME NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);
      }

      // Create file_attachments table if it doesn't exist
      if (!tableNames.includes('file_attachments')) {
        logger.info('📝 Creating file_attachments table...');
        await this.run(`
                    CREATE TABLE file_attachments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        appointment_id TEXT,
                        user_id INTEGER,
                        file_name TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        file_size INTEGER,
                        mime_type TEXT,
                        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (appointment_id) REFERENCES appointments (id),
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);
      }

      // Create calendar_integrations table if it doesn't exist
      if (!tableNames.includes('calendar_integrations')) {
        logger.info('📝 Creating calendar_integrations table...');
        await this.run(`
                    CREATE TABLE calendar_integrations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        provider TEXT NOT NULL,
                        access_token TEXT,
                        refresh_token TEXT,
                        calendar_id TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        last_sync DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);
      }

      // Create system_settings table if it doesn't exist
      if (!tableNames.includes('system_settings')) {
        logger.info('📝 Creating system_settings table...');
        await this.run(`
                    CREATE TABLE system_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        setting_key TEXT UNIQUE NOT NULL,
                        setting_value TEXT,
                        setting_type TEXT DEFAULT 'string',
                        description TEXT,
                        is_public BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

        // Insert default settings
        const settings = [
          [
            'system_name',
            'نظام حجز المواعيد للموظفين',
            'string',
            'System display name',
            1,
          ],
          ['system_version', '2.0.0', 'string', 'System version', 1],
          ['default_timezone', 'Asia/Riyadh', 'string', 'Default timezone', 1],
          [
            'appointment_duration',
            '60',
            'number',
            'Default appointment duration in minutes',
            0,
          ],
          [
            'max_appointments_per_day',
            '5',
            'number',
            'Maximum appointments per user per day',
            0,
          ],
          [
            'reminder_hours',
            '24',
            'number',
            'Hours before appointment to send reminder',
            0,
          ],
          [
            'auto_approve_appointments',
            'false',
            'boolean',
            'Auto-approve appointments without admin review',
            0,
          ],
          [
            'allow_recurring_appointments',
            'true',
            'boolean',
            'Allow users to create recurring appointments',
            0,
          ],
          [
            'enable_email_notifications',
            'true',
            'boolean',
            'Enable email notifications',
            0,
          ],
          [
            'enable_push_notifications',
            'true',
            'boolean',
            'Enable push notifications',
            0,
          ],
          [
            'maintenance_mode',
            'false',
            'boolean',
            'Enable maintenance mode',
            0,
          ],
          [
            'session_timeout',
            '1440',
            'number',
            'Session timeout in minutes',
            0,
          ],
        ];

        for (const [key, value, type, description, isPublic] of settings) {
          await this.run(
            'INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES (?, ?, ?, ?, ?)',
            [key, value, type, description, isPublic]
          );
        }
      }

      // Update existing tables with new columns
      const usersTableInfo = await this.query('PRAGMA table_info(users)');
      const userColumns = usersTableInfo.map(col => col.name);

      const userNewColumns = [
        { name: 'full_name', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'avatar', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN DEFAULT 1' },
        { name: 'email_verified', type: 'BOOLEAN DEFAULT 0' },
        { name: 'two_factor_enabled', type: 'BOOLEAN DEFAULT 0' },
        { name: 'two_factor_secret', type: 'TEXT' },
        { name: 'last_login', type: 'DATETIME' },
        { name: 'login_attempts', type: 'INTEGER DEFAULT 0' },
        { name: 'locked_until', type: 'DATETIME' },
        { name: 'preferences', type: 'TEXT' },
        { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      ];

      for (const column of userNewColumns) {
        if (!userColumns.includes(column.name)) {
          logger.info(`📝 Adding ${column.name} column to users table...`);
          await this.run(
            `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`
          );
        }
      }

      // Update existing users with default values
      await this.run(
        'UPDATE users SET email_verified = 1 WHERE email_verified IS NULL'
      );
      await this.run('UPDATE users SET is_active = 1 WHERE is_active IS NULL');

      // Create indexes
      logger.info('📝 Creating indexes...');
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
        'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(requested_date)',
        'CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id, requested_date, requested_time)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date)',
        'CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics(metric_name, date)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_recurring_appointments_active ON recurring_appointments(is_active)',
      ];

      for (const index of indexes) {
        await this.run(index);
      }

      logger.info('✅ Database migration completed successfully!');
    } catch (error) {
      logger.error('❌ Migration failed', { error: error.message });
      throw error;
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migration = new DatabaseMigration();
  migration
    .initialize()
    .then(() => migration.migrate())
    .then(() => migration.close())
    .then(() => {
      logger.info('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 Migration failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = DatabaseMigration;
