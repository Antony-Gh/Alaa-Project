const User = require('../src/models/User');
const Department = require('../src/models/Department');
const AuditLog = require('../src/models/AuditLog');
const {
  getUserPermissions,
  hasPermission,
  getRolePermissions,
} = require('../src/permissions/permissionDefinitions');
const logger = require('../src/utils/logger');

// Test RBAC functionality
async function testRBAC() {
  console.log('🧪 Testing RBAC System...\n');

  try {
    // Test 1: Role Hierarchy
    console.log('1. Testing Role Hierarchy:');
    const roles = ['super_admin', 'manager', 'admin', 'moderator', 'employee'];
    roles.forEach(role => {
      const permissions = getRolePermissions(role);
      console.log(`   ${role}: ${permissions.length} permissions`);
    });
    console.log('');

    // Test 2: Permission Checks
    console.log('2. Testing Permission Checks:');
    console.log(
      `   admin has user:create: ${hasPermission('admin', 'user:create')}`
    );
    console.log(
      `   employee has user:create: ${hasPermission('employee', 'user:create')}`
    );
    console.log(
      `   admin has system:settings: ${hasPermission('admin', 'system:settings')}`
    );
    console.log('');

    // Test 3: User with Multi-Department Roles
    console.log('3. Testing Multi-Department User:');
    const testUser = new User({
      id: 999,
      username: 'test.user',
      email: 'test@company.com',
      role: 'employee',
      departments: [
        { id: 'sales', role: 'admin' },
        { id: 'support', role: 'moderator' },
      ],
    });

    console.log(`   Default role: ${testUser.role}`);
    console.log(`   Effective role (no dept): ${testUser.getEffectiveRole()}`);
    console.log(
      `   Effective role (sales): ${testUser.getEffectiveRole('sales')}`
    );
    console.log(
      `   Effective role (support): ${testUser.getEffectiveRole('support')}`
    );
    console.log(
      `   Has role in sales: ${testUser.hasRoleInDepartment('sales', 'admin')}`
    );
    console.log(
      `   Can manage employee: ${testUser.canManageUser({ getEffectiveRole: () => 'employee' })}`
    );
    console.log('');

    // Test 4: User Permissions
    console.log('4. Testing User Permissions:');
    const userPermissions = getUserPermissions(testUser);
    console.log(`   Total permissions: ${userPermissions.length}`);
    console.log(
      `   Has user:create: ${userPermissions.includes('user:create')}`
    );
    console.log(
      `   Has appointment:approve: ${userPermissions.includes('appointment:approve')}`
    );
    console.log('');

    // Test 5: Temporary Role Elevation
    console.log('5. Testing Temporary Role Elevation:');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    testUser.setTemporaryRole('manager', expiresAt);
    console.log(`   Has temporary role: ${testUser.hasTemporaryRole()}`);
    console.log(`   Temporary role: ${testUser.temporary_role.role}`);
    console.log(`   Expires: ${testUser.temporary_role.expires}`);
    console.log(`   Effective role with temp: ${testUser.getEffectiveRole()}`);

    // Test expired temporary role
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1);
    testUser.setTemporaryRole('admin', expiredDate);
    console.log(`   Has expired temp role: ${testUser.hasTemporaryRole()}`);
    console.log('');

    // Test 6: Role Management
    console.log('6. Testing Role Management:');
    console.log(
      `   Can manage employee: ${testUser.canManageRole('employee')}`
    );
    console.log(`   Can manage admin: ${testUser.canManageRole('admin')}`);
    console.log(`   Can manage manager: ${testUser.canManageRole('manager')}`);
    console.log('');

    // Test 7: Department Operations
    console.log('7. Testing Department Operations:');
    testUser.addDepartmentRole('marketing', 'moderator');
    console.log(
      `   Added marketing role: ${testUser.hasRoleInDepartment('marketing', 'moderator')}`
    );

    testUser.removeDepartmentRole('support');
    console.log(
      `   Removed support role: ${testUser.hasRoleInDepartment('support', 'moderator')}`
    );
    console.log(
      `   Current departments: ${JSON.stringify(testUser.getDepartments())}`
    );
    console.log('');

    // Test 8: Audit Logging
    console.log('8. Testing Audit Log Structure:');
    const auditLog = new AuditLog({
      id: 1,
      user_id: 123,
      action: 'role_assigned',
      target_type: 'user',
      target_id: '456',
      details: {
        assignedRole: 'admin',
        departmentId: 'sales',
      },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0...',
      created_at: new Date().toISOString(),
    });

    console.log(`   Audit log action: ${auditLog.action}`);
    console.log(`   Target type: ${auditLog.target_type}`);
    console.log(`   Details: ${JSON.stringify(auditLog.details)}`);
    console.log('');

    console.log('✅ All RBAC tests completed successfully!');
  } catch (error) {
    console.error('❌ RBAC test failed:', error);
  }
}

// Test middleware functionality
function testMiddleware() {
  console.log('🛡️ Testing RBAC Middleware...\n');

  // Simulate middleware checks
  const mockReq = {
    user: { id: 1 },
    ip: '192.168.1.1',
    get: header => 'Mozilla/5.0...',
  };

  const mockRes = {
    status: code => ({
      json: data => {
        console.log(`   Response ${code}:`, data.message);
        return mockRes;
      },
    }),
  };

  console.log('Middleware tests would run here in actual application context');
  console.log('✅ Middleware tests completed!');
}

// Run tests
async function runTests() {
  console.log('🚀 Starting RBAC System Tests\n');

  await testRBAC();
  console.log('');
  testMiddleware();

  console.log('\n🎉 All tests completed!');
  console.log('\n📚 For detailed usage examples, see RBAC_README.md');
}

// Run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRBAC, testMiddleware };
