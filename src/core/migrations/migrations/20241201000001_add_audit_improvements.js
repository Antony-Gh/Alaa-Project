/**
 * Migration: Add audit improvements
 * Created: 2024-12-01T00:00:01.000Z
 */

module.exports = {
  async up(db) {
    // Add indexes for better performance
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
      ON audit_logs(user_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
      ON audit_logs(action)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON audit_logs(created_at)
    `);

    // Add session tracking table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
      ON user_sessions(session_token)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
      ON user_sessions(user_id)
    `);
  },

  async down(db) {
    await db.run('DROP INDEX IF EXISTS idx_audit_logs_user_id');
    await db.run('DROP INDEX IF EXISTS idx_audit_logs_action');
    await db.run('DROP INDEX IF EXISTS idx_audit_logs_created_at');
    await db.run('DROP TABLE IF EXISTS user_sessions');
    await db.run('DROP INDEX IF EXISTS idx_user_sessions_token');
    await db.run('DROP INDEX IF EXISTS idx_user_sessions_user_id');
  },
};
