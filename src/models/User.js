const dbManager = require('../utils/database');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.full_name = data.full_name;
    this.phone = data.phone;
    this.avatar = data.avatar;
    this.role = data.role; // Default role
    this.department_id = data.department_id; // Default department
    this.is_active = data.is_active;
    this.email_verified = data.email_verified;
    this.two_factor_enabled = data.two_factor_enabled;
    this.two_factor_secret = data.two_factor_secret;
    this.last_login = data.last_login;
    this.login_attempts = data.login_attempts;
    this.locked_until = data.locked_until;
    this.preferences = data.preferences ? JSON.parse(data.preferences) : {};
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Multi-department roles
    this.departments = data.departments ? JSON.parse(data.departments) : [];

    // Temporary role elevation
    this.temporary_role = data.temporary_role
      ? JSON.parse(data.temporary_role)
      : null;
  }

  // Get effective role for a specific department
  getEffectiveRole(departmentId = null) {
    // Check if temporary role is active
    if (this.temporary_role && this.temporary_role.expires) {
      const now = new Date();
      const expiresAt = new Date(this.temporary_role.expires);

      if (now < expiresAt) {
        return this.temporary_role.role;
      } else {
        // Clear expired temporary role
        this.clearTemporaryRole();
      }
    }

    // If no specific department requested, return default role
    if (!departmentId) {
      return this.role;
    }

    // Find department-specific role
    const departmentRole = this.departments.find(d => d.id === departmentId);
    return departmentRole ? departmentRole.role : this.role;
  }

  // Get all departments where user has roles
  getDepartments() {
    return this.departments;
  }

  // Check if user has role in specific department
  hasRoleInDepartment(departmentId, role) {
    const deptRole = this.departments.find(d => d.id === departmentId);
    return deptRole && deptRole.role === role;
  }

  // Add role to department
  addDepartmentRole(departmentId, role) {
    const existingIndex = this.departments.findIndex(
      d => d.id === departmentId
    );
    if (existingIndex >= 0) {
      this.departments[existingIndex].role = role;
    } else {
      this.departments.push({ id: departmentId, role });
    }
  }

  // Remove role from department
  removeDepartmentRole(departmentId) {
    this.departments = this.departments.filter(d => d.id !== departmentId);
  }

  // Set temporary role
  setTemporaryRole(role, expiresAt) {
    this.temporary_role = {
      role,
      expires: expiresAt.toISOString(),
    };
  }

  // Clear temporary role
  clearTemporaryRole() {
    this.temporary_role = null;
  }

  // Check if temporary role is active
  hasTemporaryRole() {
    if (!this.temporary_role || !this.temporary_role.expires) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(this.temporary_role.expires);
    return now < expiresAt;
  }

  // Get role hierarchy level
  getRoleLevel(role) {
    const hierarchy = {
      super_admin: 5,
      manager: 4,
      admin: 3,
      moderator: 2,
      employee: 1,
    };
    return hierarchy[role] || 0;
  }

  // Check if user can manage target role
  canManageRole(targetRole) {
    const currentLevel = this.getRoleLevel(this.getEffectiveRole());
    const targetLevel = this.getRoleLevel(targetRole);
    return targetLevel < currentLevel;
  }

  // Check if user can manage target user
  canManageUser(targetUser) {
    const currentLevel = this.getRoleLevel(this.getEffectiveRole());
    const targetLevel = this.getRoleLevel(targetUser.getEffectiveRole());
    return targetLevel < currentLevel;
  }

  // Save user to database
  async save() {
    const updates = [
      'username = ?',
      'email = ?',
      'full_name = ?',
      'phone = ?',
      'avatar = ?',
      'role = ?',
      'department_id = ?',
      'is_active = ?',
      'email_verified = ?',
      'two_factor_enabled = ?',
      'two_factor_secret = ?',
      'last_login = ?',
      'login_attempts = ?',
      'locked_until = ?',
      'preferences = ?',
      'departments = ?',
      'temporary_role = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ];

    const params = [
      this.username,
      this.email,
      this.full_name,
      this.phone,
      this.avatar,
      this.role,
      this.department_id,
      this.is_active ? 1 : 0,
      this.email_verified ? 1 : 0,
      this.two_factor_enabled ? 1 : 0,
      this.two_factor_secret,
      this.last_login,
      this.login_attempts,
      this.locked_until,
      JSON.stringify(this.preferences),
      JSON.stringify(this.departments),
      this.temporary_role ? JSON.stringify(this.temporary_role) : null,
    ];

    if (this.id) {
      // Update existing user
      params.push(this.id);
      const result = await dbManager.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      return result.changes > 0;
    } else {
      // Create new user
      const insertFields = [
        'username',
        'email',
        'full_name',
        'phone',
        'avatar',
        'role',
        'department_id',
        'is_active',
        'email_verified',
        'two_factor_enabled',
        'two_factor_secret',
        'last_login',
        'login_attempts',
        'locked_until',
        'preferences',
        'departments',
        'temporary_role',
        'created_at',
        'updated_at',
      ];

      const insertValues = [
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        '?',
        'CURRENT_TIMESTAMP',
        'CURRENT_TIMESTAMP',
      ];

      const result = await dbManager.run(
        `INSERT INTO users (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')})`,
        params
      );

      this.id = result.lastID;
      return result.lastID;
    }
  }

  // Static method to find user by ID
  static async findById(id) {
    const userData = await dbManager.get('SELECT * FROM users WHERE id = ?', [
      id,
    ]);
    return userData ? new User(userData) : null;
  }

  // Static method to find user by username
  static async findByUsername(username) {
    const userData = await dbManager.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return userData ? new User(userData) : null;
  }

  // Static method to find user by email
  static async findByEmail(email) {
    const userData = await dbManager.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return userData ? new User(userData) : null;
  }

  // Static method to get all users with pagination
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      department_id,
      is_active,
      search,
    } = options;

    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM users';
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (department_id) {
      conditions.push('department_id = ?');
      params.push(department_id);
    }

    if (is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (search) {
      conditions.push('(username LIKE ? OR full_name LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = await dbManager.query(sql, params);
    return users.map(userData => new User(userData));
  }
}

module.exports = User;
