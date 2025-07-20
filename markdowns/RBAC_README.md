# Advanced Role-Based Access Control (RBAC) System

## Overview

This document describes the comprehensive RBAC system implemented for the multi-department user management system. The system provides granular permission control, multi-department role support, temporary role elevation, and comprehensive audit logging.

## 🏗️ Architecture

### Core Components

1. **Models** (`src/models/`)
   - `User.js` - Enhanced user model with multi-department roles
   - `Department.js` - Department management
   - `AuditLog.js` - Comprehensive audit logging

2. **Permissions** (`src/permissions/`)
   - `permissionDefinitions.js` - Permission definitions and role mappings

3. **Middleware** (`src/middleware/`)
   - `rbac.js` - RBAC middleware for role and permission checks

4. **Controllers** (`src/controllers/`)
   - `rbacController.js` - RBAC management operations

5. **Routes** (`src/routes/`)
   - `rbacRoutes.js` - RBAC API endpoints

## 🎭 Role Hierarchy

```
Super Admin (5) > Manager (4) > Admin (3) > Moderator (2) > Employee (1)
```

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Super Admin** | Full system access | All permissions across all departments |
| **Manager** | Manages all users in all departments | User management, department oversight |
| **Admin** | CRUD access to users in assigned departments | Department-specific user management |
| **Moderator** | CRUD access to employees in assigned departments | Employee management within departments |
| **Employee** | Regular user | Basic system access, own data management |

## 🔐 Permission System

### Permission Format
Permissions follow the format: `resource:action`

### Core Permissions

#### User Management
- `user:create` - Create new users
- `user:read` - View user information
- `user:update` - Update user information
- `user:delete` - Delete users
- `user:activate` - Activate/deactivate users
- `user:assign_role` - Assign roles to users
- `user:view_audit` - View user audit logs

#### Department Management
- `department:create` - Create new departments
- `department:read` - View department information
- `department:update` - Update department information
- `department:delete` - Delete departments
- `department:assign_manager` - Assign managers to departments

#### Role Management
- `role:assign` - Assign roles to users
- `role:create` - Create custom roles
- `role:update` - Update role definitions
- `role:delete` - Delete roles
- `role:elevate_temporary` - Grant temporary role elevation

#### Appointment Management
- `appointment:create` - Create appointments
- `appointment:read` - View appointments
- `appointment:update` - Update appointments
- `appointment:delete` - Delete appointments
- `appointment:approve` - Approve appointments
- `appointment:reject` - Reject appointments
- `appointment:view_all` - View all appointments across departments

## 🏢 Multi-Department Support

### User Department Structure
```json
{
  "userId": "u123",
  "departments": [
    { "id": "sales", "role": "admin" },
    { "id": "support", "role": "moderator" }
  ]
}
```

### Department-Specific Permissions
Users can have different roles in different departments, with permissions scoped to their department assignments.

## ⏰ Temporary Role Elevation

### Structure
```json
{
  "temporaryRole": {
    "role": "admin",
    "expires": "2025-07-30T23:59:59Z"
  }
}
```

### Features
- Time-limited role elevation
- Automatic expiration
- Audit logging of all temporary role changes
- Permission-based granting (requires `role:elevate_temporary`)

## 🔍 Audit Logging

### Logged Actions
- Role assignments/removals
- Temporary role grants/revocations
- Permission checks
- Access denials
- User management operations

### Audit Log Structure
```json
{
  "id": 1,
  "user_id": 123,
  "action": "role_assigned",
  "target_type": "user",
  "target_id": "456",
  "details": {
    "assignedRole": "admin",
    "departmentId": "sales"
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## 🛡️ Middleware Usage

### Role-Based Middleware
```javascript
const { requireAdmin, requireManager } = require('../middleware/rbac');

// Require specific role
router.get('/admin-only', requireAdmin, adminController.action);

// Check role dynamically
router.get('/manager-plus', checkRole('manager'), managerController.action);
```

### Permission-Based Middleware
```javascript
const { hasPermission, requireUserCreate } = require('../middleware/rbac');

// Check specific permission
router.post('/users', hasPermission('user:create'), userController.create);

// Use convenience middleware
router.post('/users', requireUserCreate, userController.create);
```

### Department-Based Middleware
```javascript
const { hasPermissionInDept, belongsToDepartment } = require('../middleware/rbac');

// Check permission in specific department
router.get('/dept/:departmentId/users', 
  hasPermissionInDept('user:read'), 
  userController.getDepartmentUsers
);

// Check department membership
router.get('/dept/:departmentId', 
  belongsToDepartment(), 
  departmentController.getDepartment
);
```

### User Management Middleware
```javascript
const { canManageUser, canManageRole } = require('../middleware/rbac');

// Check if user can manage target user
router.put('/users/:id', canManageUser(), userController.updateUser);

// Check if user can manage specific role
router.post('/assign-role', canManageRole('admin'), rbacController.assignRole);
```

## 📡 API Endpoints

### RBAC Management

#### Get User Permissions
```http
GET /api/rbac/permissions
Authorization: Bearer <token>
```

#### Get Roles and Permissions
```http
GET /api/rbac/roles
Authorization: Bearer <token>
```

#### Assign Role to User
```http
POST /api/rbac/assign-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "role": "admin",
  "departmentId": "sales"  // Optional
}
```

#### Remove Role from User
```http
POST /api/rbac/remove-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "departmentId": "sales"  // Required for department roles
}
```

#### Grant Temporary Role
```http
POST /api/rbac/grant-temporary-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "role": "admin",
  "expiresAt": "2025-07-30T23:59:59Z"
}
```

#### Revoke Temporary Role
```http
POST /api/rbac/revoke-temporary-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123
}
```

#### Get Users by Role
```http
GET /api/rbac/users-by-role?role=admin&departmentId=sales
Authorization: Bearer <token>
```

#### Get User Department Roles
```http
GET /api/rbac/user/123/department-roles
Authorization: Bearer <token>
```

#### Check User Permission
```http
POST /api/rbac/check-permission
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "permission": "user:create",
  "departmentId": "sales"
}
```

#### Get RBAC Audit Logs
```http
GET /api/rbac/audit-logs?page=1&limit=50&action=role_assigned
Authorization: Bearer <token>
```

#### Get RBAC Statistics
```http
GET /api/rbac/statistics
Authorization: Bearer <token>
```

## 🚀 Usage Examples

### Creating a User with Multi-Department Roles
```javascript
const User = require('../models/User');

const user = new User({
  username: 'john.doe',
  email: 'john@company.com',
  role: 'employee', // Default role
  departments: [
    { id: 'sales', role: 'admin' },
    { id: 'support', role: 'moderator' }
  ]
});

await user.save();
```

### Checking User Permissions
```javascript
const { getUserPermissions } = require('../permissions/permissionDefinitions');

const user = await User.findById(userId);
const permissions = getUserPermissions(user);

if (permissions.includes('user:create')) {
  // User can create users
}
```

### Using RBAC Middleware in Routes
```javascript
const express = require('express');
const router = express.Router();
const { 
  requireAdmin, 
  hasPermission, 
  canManageUser,
  logRBACAction 
} = require('../middleware/rbac');

// Admin-only route
router.get('/admin/users', 
  requireAdmin, 
  logRBACAction('get_users'),
  userController.getAllUsers
);

// Permission-based route
router.post('/users', 
  hasPermission('user:create'),
  logRBACAction('create_user'),
  userController.createUser
);

// User management route
router.put('/users/:id', 
  canManageUser(),
  logRBACAction('update_user'),
  userController.updateUser
);
```

### Temporary Role Elevation
```javascript
const user = await User.findById(userId);

// Grant temporary admin role for 24 hours
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + 24);

user.setTemporaryRole('admin', expiresAt);
await user.save();

// Check if temporary role is active
if (user.hasTemporaryRole()) {
  console.log('User has temporary role:', user.temporary_role.role);
}
```

## 🔧 Database Migration

### Running Migration
```bash
# Run RBAC migration
node src/utils/rbacMigration.js

# Or add to package.json scripts
npm run migrate:rbac
```

### Migration Features
- Adds `departments` and `temporary_role` columns to users table
- Updates audit_logs table structure
- Creates performance indexes
- Migrates existing data

## 📊 Monitoring and Analytics

### RBAC Statistics
The system provides comprehensive statistics including:
- User distribution by role
- Department statistics
- Recent RBAC actions
- Permission usage analytics

### Audit Log Analysis
- Track role changes over time
- Monitor access patterns
- Identify security anomalies
- Compliance reporting

## 🔒 Security Best Practices

### 1. Principle of Least Privilege
- Always assign the minimum required permissions
- Use temporary roles for short-term access needs
- Regularly review and audit user permissions

### 2. Role Hierarchy Enforcement
- Higher roles can manage lower roles
- Prevent privilege escalation
- Validate role assignments against hierarchy

### 3. Audit Trail
- Log all RBAC-related actions
- Monitor for suspicious activity
- Regular audit log reviews

### 4. Department Isolation
- Users can only access departments they're assigned to
- Validate department membership before operations
- Clear separation of concerns

## 🧪 Testing

### Unit Tests
```javascript
const { hasPermission, getUserPermissions } = require('../permissions/permissionDefinitions');

describe('RBAC Permissions', () => {
  test('admin should have user:create permission', () => {
    expect(hasPermission('admin', 'user:create')).toBe(true);
  });
  
  test('employee should not have user:create permission', () => {
    expect(hasPermission('employee', 'user:create')).toBe(false);
  });
});
```

### Integration Tests
```javascript
describe('RBAC API', () => {
  test('should assign role to user', async () => {
    const response = await request(app)
      .post('/api/rbac/assign-role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 123,
        role: 'moderator',
        departmentId: 'sales'
      });
    
    expect(response.status).toBe(200);
  });
});
```

## 📝 Configuration

### Environment Variables
```bash
# RBAC Configuration
RBAC_AUDIT_LOG_RETENTION_DAYS=90
RBAC_TEMPORARY_ROLE_MAX_DURATION_HOURS=72
RBAC_ENABLE_STRICT_MODE=true
```

### System Settings
```javascript
// RBAC system settings
const rbacSettings = {
  auditLogRetentionDays: 90,
  temporaryRoleMaxDuration: 72, // hours
  enableStrictMode: true,
  requireDepartmentAssignment: true
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user's effective role
   - Verify department assignments
   - Review permission hierarchy

2. **Temporary Role Not Working**
   - Check expiration date
   - Verify role hierarchy
   - Ensure proper permissions

3. **Department Access Issues**
   - Verify department membership
   - Check department-specific roles
   - Review department permissions

### Debug Mode
```javascript
// Enable RBAC debug logging
const logger = require('../utils/logger');
logger.level = 'debug';

// Check user permissions in detail
const user = await User.findById(userId);
console.log('User permissions:', getUserPermissions(user));
console.log('Effective role:', user.getEffectiveRole());
console.log('Departments:', user.getDepartments());
```

## 📚 Additional Resources

- [RBAC Best Practices](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Permission Design Patterns](https://martinfowler.com/articles/web-security-basics.html)
- [Audit Logging Standards](https://www.nist.gov/cyberframework)

---

This RBAC system provides a robust, scalable, and secure foundation for managing user access across multiple departments while maintaining comprehensive audit trails and supporting temporary access needs. 