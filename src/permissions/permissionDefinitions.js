// Permission definitions for the RBAC system
// Each permission is defined as: resource:action

const PERMISSIONS = {
  // User management permissions
  'user:create': 'Create new users',
  'user:read': 'View user information',
  'user:update': 'Update user information',
  'user:delete': 'Delete users',
  'user:activate': 'Activate/deactivate users',
  'user:assign_role': 'Assign roles to users',
  'user:view_audit': 'View user audit logs',

  // Department management permissions
  'department:create': 'Create new departments',
  'department:read': 'View department information',
  'department:update': 'Update department information',
  'department:delete': 'Delete departments',
  'department:assign_manager': 'Assign managers to departments',

  // Role management permissions
  'role:assign': 'Assign roles to users',
  'role:create': 'Create custom roles',
  'role:update': 'Update role definitions',
  'role:delete': 'Delete roles',
  'role:elevate_temporary': 'Grant temporary role elevation',

  // Appointment management permissions
  'appointment:create': 'Create appointments',
  'appointment:read': 'View appointments',
  'appointment:update': 'Update appointments',
  'appointment:delete': 'Delete appointments',
  'appointment:approve': 'Approve appointments',
  'appointment:reject': 'Reject appointments',
  'appointment:view_all': 'View all appointments across departments',

  // Location management permissions
  'location:create': 'Create locations',
  'location:read': 'View location information',
  'location:update': 'Update location information',
  'location:delete': 'Delete locations',

  // System administration permissions
  'system:settings': 'Manage system settings',
  'system:backup': 'Create system backups',
  'system:restore': 'Restore system from backup',
  'system:logs': 'View system logs',
  'system:maintenance': 'Perform system maintenance',

  // Analytics and reporting permissions
  'analytics:view': 'View analytics and reports',
  'analytics:export': 'Export analytics data',
  'analytics:create_reports': 'Create custom reports',

  // Notification permissions
  'notification:send': 'Send notifications to users',
  'notification:manage_templates': 'Manage notification templates',
  'notification:view_history': 'View notification history',
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  // Super Admin: Full access across system
  super_admin: [
    // User management - full access
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:activate',
    'user:assign_role',
    'user:view_audit',

    // Department management - full access
    'department:create',
    'department:read',
    'department:update',
    'department:delete',
    'department:assign_manager',

    // Role management - full access
    'role:assign',
    'role:create',
    'role:update',
    'role:delete',
    'role:elevate_temporary',

    // Appointment management - full access
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'appointment:delete',
    'appointment:approve',
    'appointment:reject',
    'appointment:view_all',

    // Location management - full access
    'location:create',
    'location:read',
    'location:update',
    'location:delete',

    // System administration - full access
    'system:settings',
    'system:backup',
    'system:restore',
    'system:logs',
    'system:maintenance',

    // Analytics and reporting - full access
    'analytics:view',
    'analytics:export',
    'analytics:create_reports',

    // Notification - full access
    'notification:send',
    'notification:manage_templates',
    'notification:view_history',
  ],

  // Manager: Manages all users in all departments
  manager: [
    // User management - can manage all users except super admins
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:activate',
    'user:assign_role',
    'user:view_audit',

    // Department management - can view and update, but not create/delete
    'department:read',
    'department:update',
    'department:assign_manager',

    // Role management - can assign roles but not create/delete
    'role:assign',
    'role:elevate_temporary',

    // Appointment management - full access
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'appointment:delete',
    'appointment:approve',
    'appointment:reject',
    'appointment:view_all',

    // Location management - full access
    'location:create',
    'location:read',
    'location:update',
    'location:delete',

    // Analytics and reporting - full access
    'analytics:view',
    'analytics:export',
    'analytics:create_reports',

    // Notification - can send notifications
    'notification:send',
    'notification:view_history',
  ],

  // Admin: CRUD access to users in assigned departments only
  admin: [
    // User management - limited to assigned departments
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:activate',
    'user:assign_role',

    // Department management - can view assigned departments
    'department:read',

    // Role management - can assign roles within their level
    'role:assign',

    // Appointment management - full access within assigned departments
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'appointment:delete',
    'appointment:approve',
    'appointment:reject',

    // Location management - full access
    'location:create',
    'location:read',
    'location:update',
    'location:delete',

    // Analytics and reporting - limited to assigned departments
    'analytics:view',
    'analytics:export',

    // Notification - can send notifications to department members
    'notification:send',
  ],

  // Moderator: CRUD access to Employees in assigned departments only
  moderator: [
    // User management - limited to employees in assigned departments
    'user:create',
    'user:read',
    'user:update',
    'user:delete',

    // Department management - can view assigned departments
    'department:read',

    // Appointment management - can manage appointments in assigned departments
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'appointment:delete',
    'appointment:approve',
    'appointment:reject',

    // Location management - can view and update locations
    'location:read',
    'location:update',

    // Analytics and reporting - limited to assigned departments
    'analytics:view',

    // Notification - can send notifications to department members
    'notification:send',
  ],

  // Employee: Regular user; no management rights
  employee: [
    // User management - can only view own profile
    'user:read',

    // Department management - can view own department
    'department:read',

    // Appointment management - can manage own appointments
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'appointment:delete',

    // Location management - can view locations
    'location:read',

    // Analytics and reporting - can view own data
    'analytics:view',
  ],
};

// Department-specific permission overrides
// These permissions are granted based on department membership
const DEPARTMENT_PERMISSIONS = {
  admin: {
    // Admins get additional permissions for departments they manage
    department_management: [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'user:activate',
      'appointment:approve',
      'appointment:reject',
    ],
  },
  moderator: {
    // Moderators get additional permissions for departments they moderate
    department_moderation: [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'appointment:approve',
      'appointment:reject',
    ],
  },
};

// Permission hierarchy - higher levels include lower level permissions
const PERMISSION_HIERARCHY = {
  super_admin: ['manager', 'admin', 'moderator', 'employee'],
  manager: ['admin', 'moderator', 'employee'],
  admin: ['moderator', 'employee'],
  moderator: ['employee'],
  employee: [],
};

// Helper function to get all permissions for a role (including inherited)
function getRolePermissions(role) {
  const permissions = new Set(ROLE_PERMISSIONS[role] || []);

  // Add permissions from lower roles in hierarchy
  const lowerRoles = PERMISSION_HIERARCHY[role] || [];
  lowerRoles.forEach(lowerRole => {
    const lowerPermissions = ROLE_PERMISSIONS[lowerRole] || [];
    lowerPermissions.forEach(permission => permissions.add(permission));
  });

  return Array.from(permissions);
}

// Helper function to check if a role has a specific permission
function hasPermission(role, permission) {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
}

// Helper function to get all permissions for a user across all departments
function getUserPermissions(user) {
  const permissions = new Set();

  // Add permissions from default role
  const defaultRolePermissions = getRolePermissions(user.role);
  defaultRolePermissions.forEach(permission => permissions.add(permission));

  // Add permissions from department-specific roles
  user.departments.forEach(dept => {
    const deptRolePermissions = getRolePermissions(dept.role);
    deptRolePermissions.forEach(permission => permissions.add(permission));
  });

  // Add temporary role permissions if active
  if (user.hasTemporaryRole()) {
    const tempRolePermissions = getRolePermissions(user.temporary_role.role);
    tempRolePermissions.forEach(permission => permissions.add(permission));
  }

  return Array.from(permissions);
}

// Helper function to check if user has permission in specific department
function hasPermissionInDepartment(user, permission, departmentId) {
  // Check temporary role first
  if (user.hasTemporaryRole()) {
    const tempRolePermissions = getRolePermissions(user.temporary_role.role);
    if (tempRolePermissions.includes(permission)) {
      return true;
    }
  }

  // Check department-specific role
  const deptRole = user.departments.find(d => d.id === departmentId);
  if (deptRole) {
    const deptRolePermissions = getRolePermissions(deptRole.role);
    if (deptRolePermissions.includes(permission)) {
      return true;
    }
  }

  // Check default role
  const defaultRolePermissions = getRolePermissions(user.role);
  return defaultRolePermissions.includes(permission);
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  DEPARTMENT_PERMISSIONS,
  PERMISSION_HIERARCHY,
  getRolePermissions,
  hasPermission,
  getUserPermissions,
  hasPermissionInDepartment,
};
