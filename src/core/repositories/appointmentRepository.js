const BaseRepository = require('./baseRepository');

/**
 * Appointment repository for appointment-specific database operations
 */
class AppointmentRepository extends BaseRepository {
  constructor(dbManager) {
    super(dbManager, 'appointments');
  }

  /**
   * Find appointments by user ID
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByUserId(userId, options = {}) {
    return await this.findAll({ user_id: userId }, options);
  }

  /**
   * Find appointments by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByDateRange(startDate, endDate, options = {}) {
    const { limit, offset, orderBy = 'appointment_date ASC' } = options;

    let query = `
      SELECT a.*, u.username, u.full_name as user_name
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.deleted_at IS NULL 
      AND DATE(a.appointment_date) BETWEEN ? AND ?
    `;

    const params = [startDate, endDate];

    query += ` ORDER BY ${orderBy}`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);

      if (offset) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await this.db.query(query, params);
  }

  /**
   * Find appointments by status
   * @param {string} status - Appointment status
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByStatus(status, options = {}) {
    return await this.findAll({ status }, options);
  }

  /**
   * Check for appointment conflicts
   * @param {number} userId - User ID
   * @param {string} appointmentDate - Appointment date/time
   * @param {number} excludeId - Appointment ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async hasConflict(userId, appointmentDate, excludeId = null) {
    let query = `
      SELECT COUNT(*) as count FROM appointments 
      WHERE user_id = ? 
      AND appointment_date = ? 
      AND status != 'cancelled'
      AND deleted_at IS NULL
    `;

    const params = [userId, appointmentDate];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.get(query, params);
    return result.count > 0;
  }

  /**
   * Get appointment statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>}
   */
  async getStatistics(filters = {}) {
    const { startDate, endDate, userId } = filters;

    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];

    if (startDate && endDate) {
      whereClause += ' AND DATE(appointment_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM appointments ${whereClause}
    `;

    return await this.db.get(query, params);
  }

  /**
   * Get upcoming appointments
   * @param {number} userId - User ID (optional)
   * @param {number} days - Number of days ahead
   * @returns {Promise<Array>}
   */
  async getUpcoming(userId = null, days = 7) {
    let query = `
      SELECT a.*, u.username, u.full_name as user_name
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.deleted_at IS NULL 
      AND a.appointment_date >= datetime('now')
      AND a.appointment_date <= datetime('now', '+${days} days')
      AND a.status IN ('pending', 'approved')
    `;

    const params = [];

    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY a.appointment_date ASC';

    return await this.db.query(query, params);
  }
}

module.exports = AppointmentRepository;
