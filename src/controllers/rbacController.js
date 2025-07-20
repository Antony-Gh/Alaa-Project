const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const {
  getUserPermissions,
  getRolePermissions,
  hasPermission,
} = require('../permissions/permissionDefinitions');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Get user's effective permissions
const getUserEffectivePermissions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new Error('User not found');
  }

  const permissions = getUserPermissions(user);
  const effectiveRole = user.getEffectiveRole();
  const departments = user.getDepartments();

  const result = {
    userId: user.id,
    username: user.username,
    defaultRole: user.role,
    effectiveRole,
    departments,
    permissions,
    hasTemporaryRole: user.hasTemporaryRole(),
    temporaryRole: user.temporary_role,
  };

  return ResponseHandler.success(
    res,
    result,
    req.t('rbac.permissions_fetched')
  );
});

// Get all roles and their permissions
const getRolesAndPermissions = asyncHandler(async (req, res) => {
  const {
    getRolePermissions,
  } = require('../permissions/permissionDefinitions');

  const roles = ['super_admin', 'manager', 'admin', 'moderator', 'employee'];
  const rolesData = {};

  roles.forEach(role => {
    rolesData[role] = {
      permissions: getRolePermissions(role),
      level: getRoleLevel(role),
    };
  });

  return ResponseHandler.success(res, rolesData, req.t('rbac.roles_fetched'));
});

// Assign role to user
const assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId, role, departmentId } = req.body;
  const currentUser = req.currentUser;

  // Validate target user
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // Check if current user can manage target user
  if (!currentUser.canManageUser(targetUser)) {
    throw new Error('Insufficient permissions to manage this user');
  }

  // Check if current user can assign this role
  if (!currentUser.canManageRole(role)) {
    throw new Error('Insufficient permissions to assign this role');
  }

  if (departmentId) {
    // Assign role to specific department
    targetUser.addDepartmentRole(departmentId, role);
  } else {
    // Assign as default role
    targetUser.role = role;
  }

  await targetUser.save();

  // Log the action
  await AuditLog.logAction({
    userId: currentUser.id,
    action: 'role_assigned',
    targetType: 'user',
    targetId: userId,
    details: {
      assignedRole: role,
      departmentId,
      targetUserId: userId,
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return ResponseHandler.success(res, targetUser, req.t('rbac.role_assigned'));
});

// Remove role from user
const removeRoleFromUser = asyncHandler(async (req, res) => {
  const { userId, departmentId } = req.body;
  const currentUser = req.currentUser;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  if (!currentUser.canManageUser(targetUser)) {
    throw new Error('Insufficient permissions to manage this user');
  }

  if (departmentId) {
    // Remove role from specific department
    targetUser.removeDepartmentRole(departmentId);
  } else {
    // Cannot remove default role, only change it
    throw new Error(
      'Cannot remove default role. Use assignRoleToUser to change it.'
    );
  }

  await targetUser.save();

  // Log the action
  await AuditLog.logAction({
    userId: currentUser.id,
    action: 'role_removed',
    targetType: 'user',
    targetId: userId,
    details: {
      departmentId,
      targetUserId: userId,
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return ResponseHandler.success(res, targetUser, req.t('rbac.role_removed'));
});

// Grant temporary role elevation
const grantTemporaryRole = asyncHandler(async (req, res) => {
  const { userId, role, expiresAt } = req.body;
  const currentUser = req.currentUser;

  // Validate required permission
  if (!getUserPermissions(currentUser).includes('role:elevate_temporary')) {
    throw new Error('Insufficient permissions to grant temporary roles');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // Check if current user can manage target user
  if (!currentUser.canManageUser(targetUser)) {
    throw new Error('Insufficient permissions to manage this user');
  }

  // Check if current user can assign this role
  if (!currentUser.canManageRole(role)) {
    throw new Error('Insufficient permissions to assign this role');
  }

  // Set temporary role
  const expirationDate = new Date(expiresAt);
  targetUser.setTemporaryRole(role, expirationDate);
  await targetUser.save();

  // Log the action
  await AuditLog.logAction({
    userId: currentUser.id,
    action: 'temporary_role_granted',
    targetType: 'user',
    targetId: userId,
    details: {
      temporaryRole: role,
      expiresAt: expirationDate.toISOString(),
      targetUserId: userId,
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return ResponseHandler.success(
    res,
    targetUser,
    req.t('rbac.temporary_role_granted')
  );
});

// Revoke temporary role elevation
const revokeTemporaryRole = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const currentUser = req.currentUser;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  if (!currentUser.canManageUser(targetUser)) {
    throw new Error('Insufficient permissions to manage this user');
  }

  // Clear temporary role
  targetUser.clearTemporaryRole();
  await targetUser.save();

  // Log the action
  await AuditLog.logAction({
    userId: currentUser.id,
    action: 'temporary_role_revoked',
    targetType: 'user',
    targetId: userId,
    details: {
      targetUserId: userId,
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return ResponseHandler.success(
    res,
    targetUser,
    req.t('rbac.temporary_role_revoked')
  );
});

// Get users by role
const getUsersByRole = asyncHandler(async (req, res) => {
  const { role, departmentId } = req.query;
  const currentUser = req.currentUser;

  if (!getUserPermissions(currentUser).includes('user:read')) {
    throw new Error('Insufficient permissions to view users');
  }

  let users;
  if (departmentId) {
    // Get users with specific role in specific department
    const department = await Department.findById(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    users = await department.getUsersByRole(role);
  } else {
    // Get all users with specific role
    users = await User.findAll({ role });
  }

  // Filter based on current user's permissions
  const filteredUsers = users.filter(user => currentUser.canManageUser(user));

  return ResponseHandler.success(
    res,
    filteredUsers,
    req.t('rbac.users_by_role_fetched')
  );
});

// Get department roles for user
const getUserDepartmentRoles = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUser = req.currentUser;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  if (!currentUser.canManageUser(targetUser)) {
    throw new Error('Insufficient permissions to view this user');
  }

  const departments = targetUser.getDepartments();
  const departmentDetails = [];

  for (const dept of departments) {
    const department = await Department.findById(dept.id);
    if (department) {
      departmentDetails.push({
        departmentId: dept.id,
        departmentName: department.name,
        role: dept.role,
      });
    }
  }

  return ResponseHandler.success(
    res,
    departmentDetails,
    req.t('rbac.department_roles_fetched')
  );
});

// Check user permissions for specific action
const checkUserPermission = asyncHandler(async (req, res) => {
  const { userId, permission, departmentId } = req.body;
  const currentUser = req.currentUser;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  const hasPermission = getUserPermissions(targetUser).includes(permission);
  const effectiveRole = targetUser.getEffectiveRole(departmentId);

  const result = {
    userId,
    permission,
    departmentId,
    hasPermission,
    effectiveRole,
    userPermissions: getUserPermissions(targetUser),
  };

  return ResponseHandler.success(res, result, req.t('rbac.permission_checked'));
});

// Get audit logs for RBAC actions
const getRBACAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, targetType, userId } = req.query;
  const currentUser = req.currentUser;

  if (!getUserPermissions(currentUser).includes('user:view_audit')) {
    throw new Error('Insufficient permissions to view audit logs');
  }

  const logs = await AuditLog.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    action,
    targetType,
    userId,
  });

  return ResponseHandler.success(res, logs, req.t('rbac.audit_logs_fetched'));
});

// Get RBAC statistics
const getRBACStatistics = asyncHandler(async (req, res) => {
  const currentUser = req.currentUser;

  if (!getUserPermissions(currentUser).includes('analytics:view')) {
    throw new Error('Insufficient permissions to view analytics');
  }

  // Get user count by role
  const roleStats = {};
  const roles = ['super_admin', 'manager', 'admin', 'moderator', 'employee'];

  for (const role of roles) {
    const users = await User.findAll({ role });
    roleStats[role] = users.length;
  }

  // Get recent RBAC actions
  const recentActions = await AuditLog.findAll({
    page: 1,
    limit: 10,
    action: [
      'role_assigned',
      'role_removed',
      'temporary_role_granted',
      'temporary_role_revoked',
    ],
  });

  // Get department statistics
  const departments = await Department.findAll();
  const deptStats = [];

  for (const dept of departments) {
    const users = await dept.getUsers();
    deptStats.push({
      departmentId: dept.id,
      departmentName: dept.name,
      userCount: users.length,
    });
  }

  const statistics = {
    roleDistribution: roleStats,
    recentActions,
    departmentStats: deptStats,
    totalUsers: Object.values(roleStats).reduce((a, b) => a + b, 0),
    totalDepartments: departments.length,
  };

  return ResponseHandler.success(
    res,
    statistics,
    req.t('rbac.statistics_fetched')
  );
});

// Helper function to get role level
function getRoleLevel(role) {
  const hierarchy = {
    super_admin: 5,
    manager: 4,
    admin: 3,
    moderator: 2,
    employee: 1,
  };
  return hierarchy[role] || 0;
}

module.exports = {
  getUserEffectivePermissions,
  getRolesAndPermissions,
  assignRoleToUser,
  removeRoleFromUser,
  grantTemporaryRole,
  revokeTemporaryRole,
  getUsersByRole,
  getUserDepartmentRoles,
  checkUserPermission,
  getRBACAuditLogs,
  getRBACStatistics,
};
