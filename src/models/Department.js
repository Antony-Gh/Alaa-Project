const dbManager = require('../utils/database');
const logger = require('../utils/logger');

class Department {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.manager_id = data.manager_id;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Save department to database
  async save() {
    const updates = [
      'name = ?',
      'description = ?',
      'manager_id = ?',
      'is_active = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ];

    const params = [
      this.name,
      this.description,
      this.manager_id,
      this.is_active ? 1 : 0,
    ];

    if (this.id) {
      // Update existing department
      params.push(this.id);
      const result = await dbManager.run(
        `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      return result.changes > 0;
    } else {
      // Create new department
      const result = await dbManager.run(
        `INSERT INTO departments (name, description, manager_id, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        params
      );

      this.id = result.lastID;
      return result.lastID;
    }
  }

  // Get department manager
  async getManager() {
    if (!this.manager_id) return null;

    const User = require('./User');
    return await User.findById(this.manager_id);
  }

  // Get all users in this department
  async getUsers() {
    const User = require('./User');
    return await User.findAll({ department_id: this.id });
  }

  // Get users by role in this department
  async getUsersByRole(role) {
    const User = require('./User');
    const users = await User.findAll({ department_id: this.id });
    return users.filter(user => user.getEffectiveRole(this.id) === role);
  }

  // Static method to find department by ID
  static async findById(id) {
    const deptData = await dbManager.get(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    return deptData ? new Department(deptData) : null;
  }

  // Static method to find department by name
  static async findByName(name) {
    const deptData = await dbManager.get(
      'SELECT * FROM departments WHERE name = ?',
      [name]
    );
    return deptData ? new Department(deptData) : null;
  }

  // Static method to get all departments
  static async findAll(options = {}) {
    const { is_active } = options;

    let sql = 'SELECT * FROM departments';
    const params = [];
    const conditions = [];

    if (is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY name ASC';

    const departments = await dbManager.query(sql, params);
    return departments.map(deptData => new Department(deptData));
  }

  // Static method to get active departments
  static async findActive() {
    return await this.findAll({ is_active: true });
  }

  // Delete department
  async delete() {
    // Check if department has users
    const userCount = await dbManager.get(
      'SELECT COUNT(*) as count FROM users WHERE department_id = ?',
      [this.id]
    );

    if (userCount.count > 0) {
      throw new Error('Cannot delete department with existing users');
    }

    const result = await dbManager.run('DELETE FROM departments WHERE id = ?', [
      this.id,
    ]);
    return result.changes > 0;
  }
}

module.exports = Department;
