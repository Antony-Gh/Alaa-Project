const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const {
  getUserPermissions,
  hasPermissionInDepartment,
} = require('../permissions/permissionDefinitions');
const logger = require('../utils/logger');

// Middleware to check if user has a specific role
const checkRole = requiredRole => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      const effectiveRole = user.getEffectiveRole();

      // Check role hierarchy
      const roleHierarchy = {
        super_admin: 5,
        manager: 4,
        admin: 3,
        moderator: 2,
        employee: 1,
      };

      const userLevel = roleHierarchy[effectiveRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        // Log access denied
        await AuditLog.logAction({
          userId: user.id,
          action: 'access_denied',
          targetType: 'role_check',
          targetId: requiredRole,
          details: {
            userRole: effectiveRole,
            requiredRole,
            userLevel,
            requiredLevel,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. ${requiredRole} role required.`,
          errorCode: 'INSUFFICIENT_ROLE',
        });
      }

      // Add user object to request for use in controllers
      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Role check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'ROLE_CHECK_ERROR',
      });
    }
  };
};

// Middleware to check if user has a specific permission
const hasPermission = requiredPermission => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      const userPermissions = getUserPermissions(user);

      if (!userPermissions.includes(requiredPermission)) {
        // Log access denied
        await AuditLog.logAction({
          userId: user.id,
          action: 'access_denied',
          targetType: 'permission_check',
          targetId: requiredPermission,
          details: {
            userPermissions,
            requiredPermission,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. ${requiredPermission} permission required.`,
          errorCode: 'INSUFFICIENT_PERMISSION',
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Permission check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

// Middleware to check if user has permission in specific department
const hasPermissionInDept = requiredPermission => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      // Get department ID from request params, body, or query
      const departmentId =
        req.params.departmentId ||
        req.body.department_id ||
        req.query.department_id;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID required',
          errorCode: 'DEPARTMENT_ID_REQUIRED',
        });
      }

      const hasPermission = hasPermissionInDepartment(
        user,
        requiredPermission,
        departmentId
      );
      if (!hasPermission) {
        // Log access denied
        await AuditLog.logAction({
          userId: user.id,
          action: 'access_denied',
          targetType: 'department_permission_check',
          targetId: departmentId,
          details: {
            requiredPermission,
            departmentId,
            userDepartments: user.departments,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions for department ${departmentId}. ${requiredPermission} permission required.`,
          errorCode: 'INSUFFICIENT_DEPARTMENT_PERMISSION',
        });
      }

      req.currentUser = user;
      req.targetDepartmentId = departmentId;
      next();
    } catch (error) {
      logger.error('Department permission check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'DEPARTMENT_PERMISSION_CHECK_ERROR',
      });
    }
  };
};

// Middleware to check if user can manage target user
const canManageUser = () => {
  return async (req, res, next) => {
    try {
      const currentUser = await User.findById(req.user.id);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      const targetUserId =
        req.params.id || req.params.userId || req.body.user_id;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID required',
          errorCode: 'TARGET_USER_ID_REQUIRED',
        });
      }

      // Prevent self-management for certain operations
      if (parseInt(targetUserId) === currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'Cannot manage your own account',
          errorCode: 'SELF_MANAGEMENT_NOT_ALLOWED',
        });
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found',
          errorCode: 'TARGET_USER_NOT_FOUND',
        });
      }

      if (!currentUser.canManageUser(targetUser)) {
        // Log access denied
        await AuditLog.logAction({
          userId: currentUser.id,
          action: 'access_denied',
          targetType: 'user_management',
          targetId: targetUserId,
          details: {
            currentUserRole: currentUser.getEffectiveRole(),
            targetUserRole: targetUser.getEffectiveRole(),
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to manage this user',
          errorCode: 'INSUFFICIENT_USER_MANAGEMENT_PERMISSION',
        });
      }

      req.currentUser = currentUser;
      req.targetUser = targetUser;
      next();
    } catch (error) {
      logger.error('User management check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'USER_MANAGEMENT_CHECK_ERROR',
      });
    }
  };
};

// Middleware to check if user can manage target role
const canManageRole = targetRole => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      if (!user.canManageRole(targetRole)) {
        // Log access denied
        await AuditLog.logAction({
          userId: user.id,
          action: 'access_denied',
          targetType: 'role_management',
          targetId: targetRole,
          details: {
            currentUserRole: user.getEffectiveRole(),
            targetRole,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions to manage ${targetRole} role`,
          errorCode: 'INSUFFICIENT_ROLE_MANAGEMENT_PERMISSION',
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Role management check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'ROLE_MANAGEMENT_CHECK_ERROR',
      });
    }
  };
};

// Middleware to check if user belongs to department
const belongsToDepartment = () => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      const departmentId =
        req.params.departmentId ||
        req.body.department_id ||
        req.query.department_id;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID required',
          errorCode: 'DEPARTMENT_ID_REQUIRED',
        });
      }

      // Check if user has role in this department
      const hasRole = user.hasRoleInDepartment(departmentId);

      if (!hasRole && user.department_id !== parseInt(departmentId)) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to this department',
          errorCode: 'DEPARTMENT_ACCESS_DENIED',
        });
      }

      req.currentUser = user;
      req.targetDepartmentId = departmentId;
      next();
    } catch (error) {
      logger.error('Department membership check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'DEPARTMENT_MEMBERSHIP_CHECK_ERROR',
      });
    }
  };
};

// Convenience middleware for common role checks
const requireSuperAdmin = checkRole('super_admin');
const requireManager = checkRole('manager');
const requireAdmin = checkRole('admin');
const requireModerator = checkRole('moderator');
const requireEmployee = checkRole('employee');

// Convenience middleware for common permission checks
const requireUserCreate = hasPermission('user:create');
const requireUserRead = hasPermission('user:read');
const requireUserUpdate = hasPermission('user:update');
const requireUserDelete = hasPermission('user:delete');
const requireUserAssignRole = hasPermission('user:assign_role');

const requireDepartmentCreate = hasPermission('department:create');
const requireDepartmentRead = hasPermission('department:read');
const requireDepartmentUpdate = hasPermission('department:update');
const requireDepartmentDelete = hasPermission('department:delete');

const requireAppointmentCreate = hasPermission('appointment:create');
const requireAppointmentRead = hasPermission('appointment:read');
const requireAppointmentUpdate = hasPermission('appointment:update');
const requireAppointmentDelete = hasPermission('appointment:delete');
const requireAppointmentApprove = hasPermission('appointment:approve');

// Additional permission middleware
const requireUserViewAudit = hasPermission('user:view_audit');
const requireAnalyticsView = hasPermission('analytics:view');

// Middleware to log all RBAC actions
const logRBACAction = action => {
  return async (req, res, next) => {
    const originalSend = res.json;

    res.json = function (data) {
      // Log the action after response is sent
      if (req.currentUser) {
        AuditLog.logAction({
          userId: req.currentUser.id,
          action,
          targetType: req.targetType || 'general',
          targetId: req.targetId || null,
          details: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            success: data.success,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }).catch(err => {
          logger.error('Failed to log RBAC action:', err);
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  // Role-based middleware
  checkRole,
  requireSuperAdmin,
  requireManager,
  requireAdmin,
  requireModerator,
  requireEmployee,

  // Permission-based middleware
  hasPermission,
  hasPermissionInDept,
  requireUserCreate,
  requireUserRead,
  requireUserUpdate,
  requireUserDelete,
  requireUserAssignRole,
  requireDepartmentCreate,
  requireDepartmentRead,
  requireDepartmentUpdate,
  requireDepartmentDelete,
  requireAppointmentCreate,
  requireAppointmentRead,
  requireAppointmentUpdate,
  requireAppointmentDelete,
  requireAppointmentApprove,
  requireUserViewAudit,
  requireAnalyticsView,

  // User management middleware
  canManageUser,
  canManageRole,

  // Department middleware
  belongsToDepartment,

  // Logging middleware
  logRBACAction,
};
