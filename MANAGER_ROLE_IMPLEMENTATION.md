# Manager Role Implementation Documentation

## 🎯 Overview

This document describes the implementation of the **Manager** role in the appointment scheduling system, including proper translation support for both Arabic and English interfaces.

## 🔧 Role Hierarchy

The system now supports the following role hierarchy:

```
super_admin → manager → admin → moderator → employee
```

### Manager Role Capabilities

- ✅ **Admin Panel Access**: Can view and manage appointments
- ✅ **User Management**: Can create, edit, and manage users
- ✅ **Moderator Creation**: Can create moderator accounts
- ✅ **Appointment Oversight**: Can view all appointments in the system
- ✅ **Department Management**: Can manage department-related tasks

## 🌐 Translation Implementation

### Frontend Translation Files

#### Arabic (`public/main/ar.json`)
```json
{
  "role": "الدور",
  "employee": "موظف",
  "admin": "مدير",
  "manager": "مدير قسم",
  "moderator": "مشرف",
  "validation.role_invalid": "الدور يجب أن يكون employee أو admin أو manager"
}
```

#### English (`public/main/en.json`)
```json
{
  "role": "Role",
  "employee": "Employee",
  "admin": "Admin",
  "manager": "Manager",
  "moderator": "Moderator",
  "validation.role_invalid": "Role must be employee, admin, or manager"
}
```

### Backend Translation Files

#### Arabic (`src/locales/ar/translation.json`)
```json
{
  "role.employee": "موظف",
  "role.admin": "مدير",
  "role.manager": "مدير قسم",
  "role.moderator": "مشرف"
}
```

#### English (`src/locales/en/translation.json`)
```json
{
  "role.employee": "Employee",
  "role.admin": "Admin",
  "role.manager": "Manager",
  "role.moderator": "Moderator"
}
```

## 🔧 Code Changes

### 1. Backend Controllers

#### User Controller (`src/controllers/userController.js`)
```javascript
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
```

#### Appointment Controller (`src/controllers/appointmentController.js`)
```javascript
// For non-admin and non-manager users, only show their own appointments
if (req.user.role !== 'admin' && req.user.role !== 'manager') {
  conditions.push('a.user_id = ?');
  params.push(req.user.id);
}

// Check if user has access to this appointment
if (
  req.user.role !== 'admin' &&
  req.user.role !== 'manager' &&
  appointment.employee_id !== req.user.username
) {
  throw new AuthorizationError(req.t('error.forbidden'));
}
```

#### Auth Middleware (`src/middleware/auth.js`)
```javascript
// Require admin or manager role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });

    return res.status(403).json({
      success: false,
      message: 'Admin or manager access required',
      errorCode: 'ADMIN_REQUIRED',
    });
  }
  next();
};

// Require employee role, admin, or manager
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin' && req.user.role !== 'manager') {
    logger.warn('Unauthorized employee access attempt', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });

    return res.status(403).json({
      success: false,
      message: 'Employee, admin, or manager access required',
      errorCode: 'EMPLOYEE_REQUIRED',
    });
  }
  next();
};
```

### 2. Frontend JavaScript (`public/main/script.js`)

#### Role Display Logic
```javascript
setTextContent(
  userRole,
  currentUser.role === 'admin'
    ? t('admin')
    : currentUser.role === 'manager'
      ? t('manager')
      : currentUser.role === 'moderator'
        ? t('moderator')
        : t('employee')
);
```

#### Tab Visibility Logic
```javascript
// Show/hide admin tab based on role
if (currentUser.role === 'admin' || currentUser.role === 'manager') {
  adminTab.classList.remove('admin-tab-hidden');
} else {
  adminTab.classList.add('admin-tab-hidden');
}

// Show/hide user management tab based on role
if (
  currentUser.role === 'admin' ||
  currentUser.role === 'manager' ||
  currentUser.role === 'moderator'
) {
  userManagementTab.classList.remove('admin-moderator-tab-hidden');
} else {
  userManagementTab.classList.add('admin-moderator-tab-hidden');
}
```

#### Appointment Filtering
```javascript
const appointmentCards = appointmentsArray
  .filter(
    apt =>
      apt.employee_id === currentUser.username ||
      currentUser.role === 'admin' ||
      currentUser.role === 'manager'
  )
  .map(appointment => createAppointmentCard(appointment, false))
  .join('');
```

#### User Management Permissions
```javascript
// Show/hide moderator option based on current user role
if (
  currentUser &&
  (currentUser.role === 'admin' || currentUser.role === 'manager')
) {
  moderatorOption.style.display = 'block';
} else {
  moderatorOption.style.display = 'none';
}
```

### 2. HTML Template (`public/main/index.html`)

#### User Role Selection
```html
<select id="userRole" name="role" required title="role">
  <option value="employee" data-i18n="employee"></option>
  <option value="manager" data-i18n="manager"></option>
  <option value="moderator" data-i18n="moderator" id="moderatorOption"></option>
</select>
```

## 🧪 Testing

### Test Scripts
```bash
# Frontend tests
npm run test:manager-role

# Backend tests
npm run test:backend-manager-role
```

### Test Coverage

#### Frontend Tests
- ✅ Role display logic
- ✅ Tab visibility logic
- ✅ Appointment filtering logic
- ✅ Translation keys validation
- ✅ Role validation
- ✅ Role hierarchy testing

#### Backend Tests
- ✅ Role hierarchy validation
- ✅ User management permissions
- ✅ Appointment access permissions
- ✅ Middleware permissions
- ✅ User visibility permissions
- ✅ Role hierarchy structure validation

### Expected Test Results
```
🔍 Testing Role Display Logic:
✅ admin_user (admin): Admin
✅ manager_user (manager): Manager
✅ moderator_user (moderator): Moderator
✅ employee_user (employee): Employee

🔍 Testing Tab Visibility Logic:
✅ admin_user (admin):
   - Admin Tab: Visible
   - User Management Tab: Visible
   - Can Create Moderators: Yes
✅ manager_user (manager):
   - Admin Tab: Visible
   - User Management Tab: Visible
   - Can Create Moderators: Yes
✅ moderator_user (moderator):
   - Admin Tab: Hidden
   - User Management Tab: Visible
   - Can Create Moderators: No
✅ employee_user (employee):
   - Admin Tab: Hidden
   - User Management Tab: Hidden
   - Can Create Moderators: No
```

## 📊 Role Permissions Matrix

| Feature | Employee | Moderator | Manager | Admin |
|---------|----------|-----------|---------|-------|
| View own appointments | ✅ | ✅ | ✅ | ✅ |
| Create appointments | ✅ | ✅ | ✅ | ✅ |
| View all appointments | ❌ | ❌ | ✅ | ✅ |
| Manage appointments | ❌ | ❌ | ✅ | ✅ |
| User management | ❌ | ✅ | ✅ | ✅ |
| Create moderators | ❌ | ❌ | ✅ | ✅ |
| Admin panel access | ❌ | ❌ | ✅ | ✅ |

## 🔄 Data Flow

### 1. User Registration
- New users are registered as `employee` by default
- Managers can be created through user management interface
- Role validation ensures only valid roles are accepted

### 2. Role-Based Access Control
- Frontend checks user role before showing/hiding features
- Backend validates permissions for each API endpoint
- Translation system provides localized role names

### 3. Appointment Management
- Managers can view and manage all appointments
- Filtering logic includes manager role in admin-level access
- Appointment cards show appropriate actions based on role

## 🚀 Benefits

1. **Enhanced Security**: Proper role-based access control
2. **Better Organization**: Clear hierarchy of permissions
3. **Localized Experience**: Full translation support
4. **Scalable Design**: Easy to add new roles in the future
5. **Consistent UI**: Role-appropriate interface elements

## 📁 Files Modified

1. **`public/main/ar.json`**
   - Added manager role translation
   - Updated validation message

2. **`public/main/en.json`**
   - Added manager role translation
   - Updated validation message

3. **`src/locales/ar/translation.json`**
   - Added role translations for all roles

4. **`src/locales/en/translation.json`**
   - Added role translations for all roles

5. **`public/main/index.html`**
   - Added manager option to user role selection

6. **`public/main/script.js`**
   - Updated role display logic
   - Updated tab visibility logic
   - Updated appointment filtering
   - Updated user management permissions

7. **`src/controllers/userController.js`**
   - Updated role hierarchy validation
   - Updated user management permissions
   - Added manager role to role hierarchy

8. **`src/controllers/appointmentController.js`**
   - Updated appointment access permissions
   - Added manager role to admin-level access

9. **`src/middleware/auth.js`**
   - Updated requireAdmin middleware
   - Updated requireEmployee middleware
   - Added manager role to admin permissions

10. **`test-manager-role.js`**
    - Created comprehensive frontend test suite
    - Tests role display and permissions
    - Validates translation integration

11. **`test-backend-manager-role.js`**
    - Created comprehensive backend test suite
    - Tests role hierarchy validation
    - Validates permission enforcement

12. **`package.json`**
    - Added test scripts: `test:manager-role` and `test:backend-manager-role`

## 🎯 Summary

The manager role implementation provides:

- ✅ **Complete translation support** for Arabic and English
- ✅ **Proper role hierarchy** with appropriate permissions
- ✅ **Enhanced user management** capabilities
- ✅ **Comprehensive testing** to ensure reliability
- ✅ **Consistent user experience** across all interfaces
- ✅ **Scalable architecture** for future role additions

The manager role is now fully integrated into the system with proper translations and role-based access control! 🚀 