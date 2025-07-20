const dbManager = require('../utils/database');
const logger = require('../utils/logger');

class AuditLog {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.action = data.action;
    this.target_type = data.target_type; // 'user', 'department', 'role', 'permission'
    this.target_id = data.target_id;
    this.details = data.details ? JSON.parse(data.details) : {};
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.created_at = data.created_at;
  }

  // Save audit log to database
  async save() {
    const result = await dbManager.run(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, details, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        this.user_id,
        this.action,
        this.target_type,
        this.target_id,
        JSON.stringify(this.details),
        this.ip_address,
        this.user_agent,
      ]
    );

    this.id = result.lastID;
    return result.lastID;
  }

  // Static method to log an action
  static async logAction(options) {
    const {
      userId,
      action,
      targetType,
      targetId,
      details = {},
      ipAddress,
      userAgent,
    } = options;

    const auditLog = new AuditLog({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    await auditLog.save();

    // Also log to application logger
    logger.info('🔍 Audit Log', {
      userId,
      action,
      targetType,
      targetId,
      details,
    });

    return auditLog;
  }

  // Static method to find audit logs by user
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const logs = await dbManager.query(
      `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return logs.map(logData => new AuditLog(logData));
  }

  // Static method to find audit logs by action
  static async findByAction(action, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const logs = await dbManager.query(
      `SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [action, limit, offset]
    );

    return logs.map(logData => new AuditLog(logData));
  }

  // Static method to find audit logs by target
  static async findByTarget(targetType, targetId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const logs = await dbManager.query(
      `SELECT * FROM audit_logs WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [targetType, targetId, limit, offset]
    );

    return logs.map(logData => new AuditLog(logData));
  }

  // Static method to get all audit logs with filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
    } = options;

    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM audit_logs';
    const params = [];
    const conditions = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (targetType) {
      conditions.push('target_type = ?');
      params.push(targetType);
    }

    if (targetId) {
      conditions.push('target_id = ?');
      params.push(targetId);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = await dbManager.query(sql, params);
    return logs.map(logData => new AuditLog(logData));
  }

  // Static method to get audit statistics
  static async getStatistics(options = {}) {
    const { startDate, endDate, userId } = options;

    let sql = `
      SELECT 
        action,
        target_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM audit_logs
    `;

    const params = [];
    const conditions = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql +=
      ' GROUP BY action, target_type, DATE(created_at) ORDER BY date DESC, count DESC';

    return await dbManager.query(sql, params);
  }

  // Static method to clean old audit logs
  static async cleanOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await dbManager.run(
      'DELETE FROM audit_logs WHERE created_at < ?',
      [cutoffDate.toISOString()]
    );

    logger.info('🧹 Cleaned old audit logs', {
      deletedCount: result.changes,
      cutoffDate: cutoffDate.toISOString(),
    });

    return result.changes;
  }
}

module.exports = AuditLog;
