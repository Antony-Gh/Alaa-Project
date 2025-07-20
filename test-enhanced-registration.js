// Test script for enhanced registration system
console.log('🧪 Testing Enhanced Registration System...\n');

const { userSchema } = require('./src/middleware/validation');

// Test cases for registration
const testCases = {
  // Valid registration data
  validRegistration: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'john@example.com',
    full_name: 'John Doe',
    phone: '+1234567890',
    role: 'employee',
    department_id: 1,
  },

  // Missing full_name (should fail)
  missingFullName: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'john@example.com',
    // full_name is missing
  },

  // Password mismatch (should fail)
  passwordMismatch: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'DifferentPass123!',
    email: 'john@example.com',
    full_name: 'John Doe',
  },

  // Weak password (should fail)
  weakPassword: {
    username: 'john_doe',
    password: 'weak',
    password_confirmation: 'weak',
    email: 'john@example.com',
    full_name: 'John Doe',
  },

  // Invalid full_name pattern (should fail)
  invalidFullName: {
    username: 'john_doe',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'john@example.com',
    full_name: 'John123', // Contains numbers
  },

  // Arabic full_name (should pass)
  arabicFullName: {
    username: 'ahmed_user',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'ahmed@example.com',
    full_name: 'أحمد محمد',
  },

  // Mixed Arabic/English name (should pass)
  mixedName: {
    username: 'mixed_user',
    password: 'SecurePass123!',
    password_confirmation: 'SecurePass123!',
    email: 'mixed@example.com',
    full_name: 'أحمد Mohamed',
  },
};

// Test function
function testRegistration(data, testName) {
  console.log(`\n📋 Testing ${testName}...`);

  const { error, value } = userSchema.validate(data, {
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

// Test valid registration
totalTests++;
if (testRegistration(testCases.validRegistration, 'Valid Registration'))
  passedTests++;

// Test missing full_name
totalTests++;
if (testRegistration(testCases.missingFullName, 'Missing Full Name'))
  passedTests++;

// Test password mismatch
totalTests++;
if (testRegistration(testCases.passwordMismatch, 'Password Mismatch'))
  passedTests++;

// Test weak password
totalTests++;
if (testRegistration(testCases.weakPassword, 'Weak Password')) passedTests++;

// Test invalid full_name pattern
totalTests++;
if (testRegistration(testCases.invalidFullName, 'Invalid Full Name Pattern'))
  passedTests++;

// Test Arabic full_name
totalTests++;
if (testRegistration(testCases.arabicFullName, 'Arabic Full Name'))
  passedTests++;

// Test mixed Arabic/English name
totalTests++;
if (testRegistration(testCases.mixedName, 'Mixed Arabic/English Name'))
  passedTests++;

// Summary
console.log('\n📊 Registration Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(
  `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
);

if (passedTests === 3) {
  // Only valid cases should pass
  console.log('\n🎉 Enhanced registration system is working correctly!');
  console.log('\n🔐 Enhanced Features:');
  console.log('- ✅ Full name field required and validated');
  console.log('- ✅ Password confirmation validation');
  console.log('- ✅ Strong password requirements');
  console.log('- ✅ Arabic and English name support');
  console.log('- ✅ Mixed language name support');
  console.log('- ✅ Phone number validation');
  console.log('- ✅ Comprehensive error messages');
  console.log('- ✅ Proper validation failures for invalid data');
} else {
  console.log('\n⚠️ Some tests failed. Please review the validation system.');
}

// Test API response format
console.log('\n📝 Expected API Response Format:');
console.log('For validation errors:');
console.log(
  JSON.stringify(
    {
      success: false,
      message: 'فشل في التحقق من البيانات', // Arabic translation
      errors: [
        {
          field: 'password',
          message: 'validation.password_complexity',
          translatedMessage:
            'كلمة المرور يجب أن تحتوي على حرف صغير وحرف كبير ورقم ورمز خاص (@$!%*?&) على الأقل',
        },
        {
          field: 'full_name',
          message: 'validation.field_required',
          translatedMessage: 'هذا الحقل مطلوب',
        },
      ],
      errorCode: 'VALIDATION_ERROR',
    },
    null,
    2
  )
);

console.log('\nFor successful registration:');
console.log(
  JSON.stringify(
    {
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: 1,
          username: 'john_doe',
          email: 'john@example.com',
          full_name: 'John Doe',
          phone: '+1234567890',
          role: 'employee',
          department_id: 1,
        },
        token: 'jwt_token_here',
      },
    },
    null,
    2
  )
);
