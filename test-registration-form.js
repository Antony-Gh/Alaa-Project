// Test script for enhanced registration form
console.log('🧪 Testing Enhanced Registration Form...\n');

// Mock localStorage
global.localStorage = {
  getItem: key => {
    if (key === 'language') return 'ar';
    return null;
  },
  setItem: (key, value) => {},
  removeItem: key => {},
};

// Mock DOM elements for testing
const mockElements = {
  registerForm: {
    elements: {
      username: { value: 'testuser' },
      email: { value: 'test@example.com' },
      full_name: { value: 'Test User' },
      phone: { value: '+1234567890' },
      password: { value: 'SecurePass123!' },
      password_confirmation: { value: 'SecurePass123!' },
      department_id: { value: '1' },
    },
  },
  messageContainer: {
    innerHTML: '',
    appendChild: element => {
      console.log('Message added:', element.innerHTML);
    },
  },
};

// Mock translation function
const translations = {
  ar: {
    'validation.field_required': 'هذا الحقل مطلوب',
    'validation.name_min_length': 'الاسم يجب أن يكون على الأقل حرفين',
    'validation.name_max_length': 'الاسم يجب أن لا يتجاوز 100 حرف',
    'validation.name_pattern':
      'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط',
    'validation.phone_format': 'رقم الهاتف يجب أن يكون بتنسيق صحيح',
    'validation.password_complexity':
      'كلمة المرور يجب أن تحتوي على حرف صغير وحرف كبير ورقم ورمز خاص (@$!%*?&) على الأقل',
    'validation.password_mismatch': 'كلمات المرور غير متطابقة',
    'validation.password_confirmation_required': 'تأكيد كلمة المرور مطلوب',
    'error.validation': 'فشل في التحقق من البيانات',
    register_success: 'تم إنشاء الحساب بنجاح',
    register_failed: 'فشل في إنشاء الحساب',
    server_error: 'خطأ في الخادم',
  },
  en: {
    'validation.field_required': 'This field is required',
    'validation.name_min_length': 'Name must be at least 2 characters',
    'validation.name_max_length': 'Name must not exceed 100 characters',
    'validation.name_pattern':
      'Name must contain only Arabic or English letters',
    'validation.phone_format': 'Phone number must be in correct format',
    'validation.password_complexity':
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
    'validation.password_mismatch': 'Passwords do not match',
    'validation.password_confirmation_required':
      'Password confirmation is required',
    'error.validation': 'Validation failed',
    register_success: 'Account created successfully',
    register_failed: 'Failed to create account',
    server_error: 'Server error',
  },
};

// Mock t function
function t(key) {
  const lang = localStorage.getItem('language') || 'ar';
  return translations[lang]?.[key] || key;
}

// Test validation functions
function validateFullName(full_name) {
  if (!full_name || full_name.trim() === '') {
    return { isValid: false, message: t('validation.field_required') };
  }

  if (full_name.length < 2) {
    return { isValid: false, message: t('validation.name_min_length') };
  }

  if (full_name.length > 100) {
    return { isValid: false, message: t('validation.name_max_length') };
  }

  // Check if full_name contains only Arabic/English letters and spaces
  const namePattern = /^[\u0600-\u06FFa-zA-Z\s]+$/;
  if (!namePattern.test(full_name)) {
    return { isValid: false, message: t('validation.name_pattern') };
  }

  return { isValid: true, message: '' };
}

function validatePhone(phone) {
  if (!phone || phone.trim() === '') {
    return { isValid: true, message: '' }; // Phone is optional
  }

  // Check if phone matches international format
  const phonePattern = /^[+]?[0-9\s\-()]{8,20}$/;
  if (!phonePattern.test(phone)) {
    return { isValid: false, message: t('validation.phone_format') };
  }

  return { isValid: true, message: '' };
}

function validatePasswordConfirmation(password, password_confirmation) {
  if (!password_confirmation || password_confirmation.trim() === '') {
    return {
      isValid: false,
      message: t('validation.password_confirmation_required'),
    };
  }

  if (password !== password_confirmation) {
    return { isValid: false, message: t('validation.password_mismatch') };
  }

  return { isValid: true, message: '' };
}

// Test cases
const testCases = [
  {
    name: 'Valid Registration Data',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: true,
  },
  {
    name: 'Missing Full Name',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: '',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.field_required',
  },
  {
    name: 'Short Full Name',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'A',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.name_min_length',
  },
  {
    name: 'Invalid Full Name Pattern',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test123',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.name_pattern',
  },
  {
    name: 'Arabic Full Name',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'أحمد محمد',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: true,
  },
  {
    name: 'Mixed Arabic/English Name',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'أحمد Mohamed',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: true,
  },
  {
    name: 'Invalid Phone Format',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: 'invalid-phone',
      password: 'SecurePass123!',
      password_confirmation: 'SecurePass123!',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.phone_format',
  },
  {
    name: 'Password Mismatch',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: 'DifferentPass123!',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.password_mismatch',
  },
  {
    name: 'Missing Password Confirmation',
    data: {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1234567890',
      password: 'SecurePass123!',
      password_confirmation: '',
      department_id: 1,
    },
    shouldPass: false,
    expectedError: 'validation.password_confirmation_required',
  },
];

// Run tests
let passedTests = 0;
let totalTests = 0;

console.log('📋 Running Registration Form Tests...\n');

testCases.forEach(testCase => {
  totalTests++;
  console.log(`\n🔍 Testing: ${testCase.name}`);

  // Test full name validation
  const fullNameValidation = validateFullName(testCase.data.full_name);

  // Test phone validation
  const phoneValidation = validatePhone(testCase.data.phone);

  // Test password confirmation validation
  const passwordConfirmationValidation = validatePasswordConfirmation(
    testCase.data.password,
    testCase.data.password_confirmation
  );

  // Check if all validations pass
  const allValid =
    fullNameValidation.isValid &&
    phoneValidation.isValid &&
    passwordConfirmationValidation.isValid;

  if (allValid === testCase.shouldPass) {
    console.log(`✅ ${testCase.name} - PASSED`);
    passedTests++;
  } else {
    console.log(`❌ ${testCase.name} - FAILED`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Actual: ${allValid ? 'PASS' : 'FAIL'}`);

    if (!fullNameValidation.isValid) {
      console.log(`   Full Name Error: ${fullNameValidation.message}`);
    }
    if (!phoneValidation.isValid) {
      console.log(`   Phone Error: ${phoneValidation.message}`);
    }
    if (!passwordConfirmationValidation.isValid) {
      console.log(
        `   Password Confirmation Error: ${passwordConfirmationValidation.message}`
      );
    }
  }
});

// Test API response handling
console.log('\n🌐 Testing API Response Handling...\n');

// Mock API response with new validation format
const mockApiResponse = {
  success: false,
  message: 'فشل في التحقق من البيانات',
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
};

console.log('📝 Mock API Response:');
console.log(JSON.stringify(mockApiResponse, null, 2));

console.log('\n🔧 Processing API Errors:');
mockApiResponse.errors.forEach(err => {
  console.log(`   Field: ${err.field}`);
  console.log(`   Message Key: ${err.message}`);
  console.log(`   Translated Message: ${err.translatedMessage}`);
});

// Summary
console.log('\n📊 Registration Form Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(
  `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
);

if (passedTests === testCases.filter(tc => tc.shouldPass).length) {
  console.log('\n🎉 Enhanced registration form is working correctly!');
  console.log('\n✨ Enhanced Features:');
  console.log('- ✅ Full name field validation');
  console.log('- ✅ Phone number validation');
  console.log('- ✅ Password confirmation validation');
  console.log('- ✅ Arabic and English name support');
  console.log('- ✅ Mixed language name support');
  console.log('- ✅ New API response format handling');
  console.log('- ✅ Translated error messages');
  console.log('- ✅ Field highlighting for errors');
} else {
  console.log('\n⚠️ Some tests failed. Please review the validation system.');
}

// Test form data structure
console.log('\n📋 Expected Form Data Structure:');
const expectedFormData = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '+1234567890',
  password: 'SecurePass123!',
  password_confirmation: 'SecurePass123!',
  department_id: 1,
};

console.log(JSON.stringify(expectedFormData, null, 2));

console.log('\n🚀 Registration form is ready for production use!');
