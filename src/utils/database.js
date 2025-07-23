const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

class DatabaseManager {
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
          logger.info('✅ Connected to SQLite database', { path: this.dbPath });
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    const tables = [
      // Users table with enhanced RBAC fields
      `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE,
                full_name TEXT,
                phone TEXT,
                avatar TEXT,
                role TEXT DEFAULT 'employee',
                department_id INTEGER,
                departments TEXT DEFAULT '[]', -- JSON array of department roles
                temporary_role TEXT, -- JSON object for temporary role elevation
                is_active BOOLEAN DEFAULT 1,
                email_verified BOOLEAN DEFAULT 0,
                two_factor_enabled BOOLEAN DEFAULT 0,
                two_factor_secret TEXT,
                last_login DATETIME,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                preferences TEXT, -- JSON string for user preferences
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments (id)
            )`,

      // Departments table
      `CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                manager_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES users (id)
            )`,

      // Locations table with enhanced fields
      `CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                capacity INTEGER,
                location_type TEXT DEFAULT 'room', -- room, equipment, vehicle, etc.
                floor TEXT,
                building TEXT,
                is_active BOOLEAN DEFAULT 1,
                maintenance_schedule TEXT, -- JSON string for maintenance schedule
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

      // Enhanced appointments table
      `CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                employee_name TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                user_id INTEGER, -- Link to users table
                department_id INTEGER,
                location_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                requested_date TEXT,
                requested_time TEXT,
                approved_date TEXT,
                approved_time TEXT,
                duration INTEGER DEFAULT 60, -- Duration in minutes
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
                admin_notes TEXT,
                rejection_reason TEXT,
                recurring_pattern TEXT, -- JSON string for recurring pattern
                parent_appointment_id TEXT, -- For recurring appointments
                tags TEXT, -- JSON array of tags
                attachments TEXT, -- JSON array of attachment paths
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (department_id) REFERENCES departments (id),
                FOREIGN KEY (location_id) REFERENCES locations (id),
                FOREIGN KEY (parent_appointment_id) REFERENCES appointments (id)
            )`,

      // Recurring appointments table
      `CREATE TABLE IF NOT EXISTS recurring_appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL, -- daily, weekly, monthly, yearly
                interval INTEGER DEFAULT 1,
                days_of_week TEXT, -- JSON array for weekly pattern
                day_of_month INTEGER, -- For monthly pattern
                month_of_year INTEGER, -- For yearly pattern
                start_date TEXT NOT NULL,
                end_date TEXT,
                max_occurrences INTEGER,
                current_occurrence INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appointment_id) REFERENCES appointments (id)
            )`,

      // Enhanced Audit logs table for RBAC
      `CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                target_type TEXT, -- user, department, role, permission, etc.
                target_id TEXT,
                details TEXT, -- JSON string for additional details
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // Analytics table
      `CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL,
                metric_data TEXT, -- JSON string for complex metrics
                date DATE NOT NULL,
                hour INTEGER,
                department_id INTEGER,
                location_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments (id),
                FOREIGN KEY (location_id) REFERENCES locations (id)
            )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL, -- email, push, sms, in_app
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT, -- JSON string for additional data
                is_read BOOLEAN DEFAULT 0,
                read_at DATETIME,
                sent_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // User sessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
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
            )`,

      // File attachments table
      `CREATE TABLE IF NOT EXISTS file_attachments (
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
            )`,

      // Calendar integrations table
      `CREATE TABLE IF NOT EXISTS calendar_integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL, -- google, outlook, etc.
                access_token TEXT,
                refresh_token TEXT,
                calendar_id TEXT,
                is_active BOOLEAN DEFAULT 1,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string', -- string, number, boolean, json
                description TEXT,
                is_public BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Create indexes for better performance
    await this.createIndexes();

    // Insert sample data
    await this.insertSampleData();

    // Insert default system settings
    await this.insertDefaultSettings();
  }

  async createIndexes() {
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
  }

  async insertSampleData() {
    // Check if data already exists
    const userCount = await this.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) {
      logger.info('📊 Sample data already exists, skipping insertion');
      return;
    }

    // Insert sample departments
    await this.run(`INSERT INTO departments (name, description) VALUES 
            ('قسم تقنية المعلومات', 'Department of Information Technology'),
            ('قسم الموارد البشرية', 'Human Resources Department'),
            ('قسم المالية', 'Finance Department'),
            ('قسم التسويق', 'Marketing Department'),
            ('قسم العمليات', 'Operations Department')`);

    // Insert sample locations
    await this
      .run(`INSERT INTO locations (name, description, capacity, location_type) VALUES 
            ('قاعة الاجتماعات الرئيسية', 'Main Conference Room', 20, 'room'),
            ('قاعة الاجتماعات الصغيرة', 'Small Meeting Room', 8, 'room'),
            ('مكتب المدير', 'Manager Office', 4, 'room'),
            ('قسم تقنية المعلومات', 'IT Department Office', 15, 'room'),
            ('مختبر الحاسوب', 'Computer Lab', 25, 'room'),
            ('بروجكتور محمول', 'Portable Projector', 1, 'equipment'),
            ('سيارة الشركة', 'Company Car', 5, 'vehicle')`);

    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    await this.run(
      `INSERT INTO users (username, password_hash, email, full_name, role, department_id, email_verified) VALUES 
            ('admin', ?, 'admin@scheduling.com', 'مدير النظام', 'admin', 1, 1)`,
      [adminPasswordHash]
    );

    // Insert sample moderator user
    const moderatorPasswordHash = await bcrypt.hash('moderator123', 10);

    await this.run(
      `INSERT INTO users (username, password_hash, email, full_name, role, department_id, email_verified) VALUES 
            ('moderator', ?, 'moderator@company.com', 'مشرف النظام', 'moderator', 1, 1)`,
      [moderatorPasswordHash]
    );

    // Insert sample employee users
    const employeePasswordHash = await bcrypt.hash('Employee123', 10);

    await this.run(
      `INSERT INTO users (username, password_hash, email, full_name, role, department_id, email_verified) VALUES 
            ('ahmed', ?, 'ahmed@company.com', 'أحمد محمد', 'employee', 1, 1),
            ('fatima', ?, 'fatima@company.com', 'فاطمة علي', 'employee', 2, 1),
            ('omar', ?, 'omar@company.com', 'عمر خالد', 'employee', 3, 1)`,
      [employeePasswordHash, employeePasswordHash, employeePasswordHash]
    );

    logger.info('✅ Sample data inserted successfully');
  }

  async insertDefaultSettings() {
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
      ['maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 0],
      ['session_timeout', '1440', 'number', 'Session timeout in minutes', 0],
    ];

    for (const [key, value, type, description, isPublic] of settings) {
      await this.run(
        'INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES (?, ?, ?, ?, ?)',
        [key, value, type, description, isPublic]
      );
    }
  }

  // Database operations
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error('❌ Database run error', { error: err.message, sql });
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
          logger.error('❌ Database get error', { error: err.message, sql });
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
          logger.error('❌ Database query error', { error: err.message, sql });
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

  // Transaction support
  async transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        try {
          const result = callback();
          this.db.run('COMMIT', err => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
            } else {
              resolve(result);
            }
          });
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }
}

module.exports = new DatabaseManager();
