const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { authenticateToken } = require('../middleware/auth');
const {
  requireUserRead,
  requireUserAssignRole,
  requireUserViewAudit,
  requireAnalyticsView,
  canManageUser,
  canManageRole,
  logRBACAction,
} = require('../middleware/rbac');
const { generalLimiter } = require('../middleware/security');

// Get user's effective permissions
router.get(
  '/permissions',
  authenticateToken,
  generalLimiter,
  logRBACAction('get_permissions'),
  rbacController.getUserEffectivePermissions
);

// Get all roles and their permissions
router.get(
  '/roles',
  authenticateToken,
  requireUserRead,
  generalLimiter,
  logRBACAction('get_roles'),
  rbacController.getRolesAndPermissions
);

// Assign role to user
router.post(
  '/assign-role',
  authenticateToken,
  requireUserAssignRole,
  canManageUser(),
  generalLimiter,
  logRBACAction('assign_role'),
  rbacController.assignRoleToUser
);

// Remove role from user
router.post(
  '/remove-role',
  authenticateToken,
  requireUserAssignRole,
  canManageUser(),
  generalLimiter,
  logRBACAction('remove_role'),
  rbacController.removeRoleFromUser
);

// Grant temporary role elevation
router.post(
  '/grant-temporary-role',
  authenticateToken,
  requireUserAssignRole,
  canManageUser(),
  generalLimiter,
  logRBACAction('grant_temporary_role'),
  rbacController.grantTemporaryRole
);

// Revoke temporary role elevation
router.post(
  '/revoke-temporary-role',
  authenticateToken,
  requireUserAssignRole,
  canManageUser(),
  generalLimiter,
  logRBACAction('revoke_temporary_role'),
  rbacController.revokeTemporaryRole
);

// Get users by role
router.get(
  '/users-by-role',
  authenticateToken,
  requireUserRead,
  generalLimiter,
  logRBACAction('get_users_by_role'),
  rbacController.getUsersByRole
);

// Get department roles for user
router.get(
  '/user/:userId/department-roles',
  authenticateToken,
  requireUserRead,
  canManageUser(),
  generalLimiter,
  logRBACAction('get_user_department_roles'),
  rbacController.getUserDepartmentRoles
);

// Check user permissions for specific action
router.post(
  '/check-permission',
  authenticateToken,
  requireUserRead,
  generalLimiter,
  logRBACAction('check_permission'),
  rbacController.checkUserPermission
);

// Get audit logs for RBAC actions
router.get(
  '/audit-logs',
  authenticateToken,
  requireUserViewAudit,
  generalLimiter,
  logRBACAction('get_rbac_audit_logs'),
  rbacController.getRBACAuditLogs
);

// Get RBAC statistics
router.get(
  '/statistics',
  authenticateToken,
  requireAnalyticsView,
  generalLimiter,
  logRBACAction('get_rbac_statistics'),
  rbacController.getRBACStatistics
);

module.exports = router;
