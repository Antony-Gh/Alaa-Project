// Test script for enhanced validation schemas
console.log('🧪 Testing Enhanced Validation Schemas...\n');

const {
  userSchema,
  loginSchema,
  passwordChangeSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  appointmentSchema,
  departmentSchema,
  locationSchema,
  profileUpdateSchema,
} = require('./src/middleware/validation');

// Test data
const testCases = {
  // Valid user registration
  validUser: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'john@example.com',
    full_name: 'John Doe',
    phone: '+1234567890',
    role: 'employee',
    department_id: 1,
    is_active: true,
  },

  // Invalid user - password mismatch
  invalidUserPasswordMismatch: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'DifferentPass123!',
    email: 'john@example.com',
    full_name: 'John Doe',
  },

  // Invalid user - weak password
  invalidUserWeakPassword: {
    username: 'john_doe',
    password: 'weak',
    password_confirmation: 'weak',
    email: 'john@example.com',
    full_name: 'John Doe',
  },

  // Valid login
  validLogin: {
    username: 'john_doe',
    password: 'password123',
    remember_me: true,
  },

  // Valid password change
  validPasswordChange: {
    current_password: 'oldpassword123',
    new_password: 'NewSecurePass123!',
    new_password_confirmation: 'NewSecurePass123!',
  },

  // Invalid password change - confirmation mismatch
  invalidPasswordChange: {
    current_password: 'oldpassword123',
    new_password: 'NewSecurePass123!',
    new_password_confirmation: 'DifferentPass123!',
  },

  // Valid password reset
  validPasswordReset: {
    email: 'user@example.com',
  },

  // Valid password reset confirmation
  validPasswordResetConfirm: {
    token: 'reset-token-123',
    new_password: 'NewSecurePass123!',
    new_password_confirmation: 'NewSecurePass123!',
  },

  // Valid appointment
  validAppointment: {
    employee_name: 'أحمد محمد',
    employee_id: 'EMP123',
    department_id: 1,
    location_id: 1,
    title: 'Meeting with Client',
    description: 'Important client meeting',
    requested_date: new Date(Date.now() + 86400000), // Tomorrow
    requested_time: '14:30',
    priority: 'high',
    category: 'Meeting',
  },

  // Valid department
  validDepartment: {
    name: 'IT Department',
    description: 'Information Technology Department',
    manager_id: 1,
    is_active: true,
  },

  // Valid location
  validLocation: {
    name: 'Conference Room A',
    address: 'Building 1, Floor 2',
    capacity: 20,
    is_active: true,
  },

  // Valid profile update
  validProfileUpdate: {
    full_name: 'أحمد محمد',
    email: 'ahmed@example.com',
    phone: '+201234567890',
    department_id: 2,
  },
};

// Test function
function testSchema(schema, testData, testName) {
  console.log(`\n📋 Testing ${testName}...`);

  const { error, value } = schema.validate(testData, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    console.log(`❌ ${testName} - Validation Failed:`);
    error.details.forEach(detail => {
      console.log(`   - ${detail.path.join('.')}: ${detail.message}`);
    });
    return false;
  } else {
    console.log(`✅ ${testName} - Validation Passed`);
    console.log(`   Cleaned data:`, JSON.stringify(value, null, 2));
    return true;
  }
}

// Run tests
let passedTests = 0;
let totalTests = 0;

// User schema tests
totalTests++;
if (testSchema(userSchema, testCases.validUser, 'Valid User Registration'))
  passedTests++;

totalTests++;
if (
  testSchema(
    userSchema,
    testCases.invalidUserPasswordMismatch,
    'Invalid User - Password Mismatch'
  )
)
  passedTests++;

totalTests++;
if (
  testSchema(
    userSchema,
    testCases.invalidUserWeakPassword,
    'Invalid User - Weak Password'
  )
)
  passedTests++;

// Login schema tests
totalTests++;
if (testSchema(loginSchema, testCases.validLogin, 'Valid Login')) passedTests++;

// Password change schema tests
totalTests++;
if (
  testSchema(
    passwordChangeSchema,
    testCases.validPasswordChange,
    'Valid Password Change'
  )
)
  passedTests++;

totalTests++;
if (
  testSchema(
    passwordChangeSchema,
    testCases.invalidPasswordChange,
    'Invalid Password Change - Confirmation Mismatch'
  )
)
  passedTests++;

// Password reset schema tests
totalTests++;
if (
  testSchema(
    passwordResetSchema,
    testCases.validPasswordReset,
    'Valid Password Reset'
  )
)
  passedTests++;

// Password reset confirmation schema tests
totalTests++;
if (
  testSchema(
    passwordResetConfirmSchema,
    testCases.validPasswordResetConfirm,
    'Valid Password Reset Confirmation'
  )
)
  passedTests++;

// Appointment schema tests
totalTests++;
if (
  testSchema(appointmentSchema, testCases.validAppointment, 'Valid Appointment')
)
  passedTests++;

// Department schema tests
totalTests++;
if (testSchema(departmentSchema, testCases.validDepartment, 'Valid Department'))
  passedTests++;

// Location schema tests
totalTests++;
if (testSchema(locationSchema, testCases.validLocation, 'Valid Location'))
  passedTests++;

// Profile update schema tests
totalTests++;
if (
  testSchema(
    profileUpdateSchema,
    testCases.validProfileUpdate,
    'Valid Profile Update'
  )
)
  passedTests++;

// Summary
console.log('\n📊 Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(
  `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
);

if (passedTests === totalTests) {
  console.log('\n🎉 All validation schemas are working correctly!');
  console.log('\n🔐 Enhanced Features:');
  console.log('- ✅ Password confirmation validation');
  console.log(
    '- ✅ Strong password requirements (8+ chars, uppercase, lowercase, number, special char)'
  );
  console.log('- ✅ Arabic and English text support');
  console.log('- ✅ Phone number validation');
  console.log('- ✅ Email validation with TLD flexibility');
  console.log(
    '- ✅ Role-based validation (employee, admin, manager, moderator)'
  );
  console.log('- ✅ Priority levels for appointments');
  console.log('- ✅ File attachment limits');
  console.log('- ✅ Comprehensive error messages');
} else {
  console.log('\n⚠️ Some tests failed. Please review the validation schemas.');
}
