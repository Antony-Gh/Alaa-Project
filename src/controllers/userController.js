const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const dbManager = require('../utils/database');
const ResponseHandler = require('../utils/responseHandler');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation functions for user management (without password confirmation)
const validateUsername = username => {
  if (!username || username.trim() === '') {
    throw new Error('Username is required');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (username.length > 50) {
    throw new Error('Username must be at most 50 characters');
  }

  const usernamePattern = /^[a-zA-Z0-9_]+$/;
  if (!usernamePattern.test(username)) {
    throw new Error(
      'Username can only contain letters, numbers, and underscores'
    );
  }
};

const validateEmail = email => {
  if (!email || email.trim() === '') {
    return; // Email is optional in user management
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new Error('Invalid email format');
  }
};

const validatePassword = password => {
  if (!password || password.trim() === '') {
    throw new Error('Password is required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  if (!hasNumbers) {
    throw new Error('Password must contain at least one number');
  }

  if (!hasSpecialChar) {
    throw new Error('Password must contain at least one special character');
  }
};

// Role hierarchy validation
const validateRoleHierarchy = (currentUserRole, targetRole) => {
  const roleHierarchy = {
    admin: 4,
    manager: 3,
    moderator: 2,
    employee: 1,
  };

  const currentUserLevel = roleHierarchy[currentUserRole];
  const targetLevel = roleHierarchy[targetRole];

  // Users can only manage roles at or below their level
  return targetLevel <= currentUserLevel;
};

// Check if user can manage target user
const canManageUser = (currentUserRole, targetUserRole) => {
  const roleHierarchy = {
    admin: 4,
    manager: 3,
    moderator: 2,
    employee: 1,
  };

  const currentUserLevel = roleHierarchy[currentUserRole];
  const targetLevel = roleHierarchy[targetUserRole];

  // Users can only manage roles below their level
  return targetLevel < currentUserLevel;
};

// Get all users (filtered by role permissions)
const getAllUsers = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  let query = `
    SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, 
           u.is_active, u.created_at, u.updated_at, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id != ?
  `;
  const params = [currentUser.id]; // Exclude current user

  // Filter by role permissions
  if (currentUser.role === 'admin') {
    // Admin can see all users
    query += ' AND u.role != "manager" ORDER BY u.role DESC, u.created_at DESC';
  } else if (currentUser.role === 'manager') {
    // Manager can see all users except super_admin
    query += ' ORDER BY u.role DESC, u.created_at DESC';
  } else if (currentUser.role === 'moderator') {
    // Moderator can only see employees
    query += ' AND u.role = "employee" ORDER BY u.created_at DESC';
  } else {
    // Employees cannot see other users
    throw new Error('Insufficient permissions');
  }

  const users = await dbManager.query(query, params);

  return ResponseHandler.success(res, users, req.t('user.fetched_all'));
});

// Get user by ID
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  const user = await dbManager.get(
    `
    SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, 
           u.is_active, u.created_at, u.updated_at, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `,
    [id]
  );

  if (!user) {
    throw new Error(req.t('user.notfound'));
  }

  // Check permissions
  if (!canManageUser(currentUser.role, user.role)) {
    throw new Error('Insufficient permissions to view this user');
  }

  return ResponseHandler.success(res, user, req.t('user.fetched'));
});

// Create new user (admin/moderator only)
const createUser = asyncHandler(async (req, res) => {
  const { username, password, email, full_name, role, department_id } =
    req.body;
  const currentUser = req.user;

  // Validate role permissions
  if (!validateRoleHierarchy(currentUser.role, role)) {
    throw new Error('Cannot create user with higher or equal role level');
  }

  // Validate input fields using our custom validation functions
  validateUsername(username);
  validatePassword(password);
  validateEmail(email);

  // Check if username already exists
  const existingUser = await dbManager.get(
    'SELECT id FROM users WHERE username = ?',
    [username]
  );
  if (existingUser) {
    throw new Error(req.t('auth.username_exists'));
  }

  // Check if email already exists
  if (email) {
    const existingEmail = await dbManager.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingEmail) {
      throw new Error(req.t('auth.email_exists'));
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert new user
  const result = await dbManager.run(
    'INSERT INTO users (username, password_hash, email, full_name, role, department_id) VALUES (?, ?, ?, ?, ?, ?)',
    [username, passwordHash, email, full_name, role, department_id]
  );

  // Get the created user
  const newUser = await dbManager.get(
    `
    SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, 
           u.created_at, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `,
    [result.lastID]
  );

  logger.info('User created', {
    createdBy: currentUser.id,
    newUserId: newUser.id,
    newUserRole: newUser.role,
  });

  return ResponseHandler.created(res, newUser, req.t('user.created'));
});

// Update user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, full_name, role, department_id, is_active } = req.body;
  const currentUser = req.user;

  // Get target user
  const targetUser = await dbManager.get(
    'SELECT role FROM users WHERE id = ?',
    [id]
  );
  if (!targetUser) {
    throw new Error(req.t('user.notfound'));
  }

  // Check permissions
  if (!canManageUser(currentUser.role, targetUser.role)) {
    throw new Error('Insufficient permissions to modify this user');
  }

  // Validate role change permissions
  if (role && !validateRoleHierarchy(currentUser.role, role)) {
    throw new Error('Cannot assign higher or equal role level');
  }

  // Check if email already exists (if changing email)
  if (email) {
    const existingEmail = await dbManager.get(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, id]
    );
    if (existingEmail) {
      throw new Error(req.t('auth.email_exists'));
    }
  }

  // Build update query
  const updates = [];
  const params = [];

  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email);
  }
  if (full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(full_name);
  }
  if (role !== undefined) {
    updates.push('role = ?');
    params.push(role);
  }
  if (department_id !== undefined) {
    updates.push('department_id = ?');
    params.push(department_id);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const result = await dbManager.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  if (result.changes === 0) {
    throw new Error(req.t('user.notfound'));
  }

  // Get updated user
  const updatedUser = await dbManager.get(
    `
    SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, 
           u.is_active, u.created_at, u.updated_at, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `,
    [id]
  );

  logger.info('User updated', {
    updatedBy: currentUser.id,
    userId: id,
    changes: updates,
  });

  return ResponseHandler.success(res, updatedUser, req.t('user.updated'));
});

// Delete user
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  // Prevent self-deletion
  if (parseInt(id) === currentUser.id) {
    throw new Error(req.t('user.cannot_delete_self'));
  }

  // Get target user
  const targetUser = await dbManager.get(
    'SELECT role FROM users WHERE id = ?',
    [id]
  );
  if (!targetUser) {
    throw new Error(req.t('user.notfound'));
  }

  // Check permissions
  if (!canManageUser(currentUser.role, targetUser.role)) {
    throw new Error('Insufficient permissions to delete this user');
  }

  // Check if user has appointments
  const appointmentCount = await dbManager.get(
    'SELECT COUNT(*) as count FROM appointments WHERE user_id = ?',
    [id]
  );

  if (appointmentCount.count > 0) {
    throw new Error('Cannot delete user with existing appointments');
  }

  // Delete user
  const result = await dbManager.run('DELETE FROM users WHERE id = ?', [id]);

  if (result.changes === 0) {
    throw new Error(req.t('user.notfound'));
  }

  logger.info('User deleted', {
    deletedBy: currentUser.id,
    userId: id,
  });

  return ResponseHandler.success(res, null, req.t('user.deleted'));
});

// Change user password (admin/moderator only)
const changeUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const currentUser = req.user;

  // Get target user
  const targetUser = await dbManager.get(
    'SELECT role FROM users WHERE id = ?',
    [id]
  );
  if (!targetUser) {
    throw new Error(req.t('user.notfound'));
  }

  // Check permissions
  if (!canManageUser(currentUser.role, targetUser.role)) {
    throw new Error("Insufficient permissions to change this user's password");
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  const result = await dbManager.run(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, id]
  );

  if (result.changes === 0) {
    throw new Error(req.t('user.notfound'));
  }

  logger.info('User password changed by admin/moderator', {
    changedBy: currentUser.id,
    userId: id,
  });

  return ResponseHandler.success(res, null, req.t('password.changed'));
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
};
