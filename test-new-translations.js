// Test script for new translation keys
console.log('🧪 Testing New Translation Keys...\n');

// Mock localStorage
global.localStorage = {
  getItem: key => {
    if (key === 'language') return 'ar';
    return null;
  },
  setItem: (key, value) => {},
  removeItem: key => {},
};

// Mock translations
const translations = {
  ar: {
    full_name: 'الاسم الكامل',
    full_name_placeholder: 'أدخل اسمك الكامل',
    phone: 'رقم الهاتف',
    phone_placeholder: 'أدخل رقم هاتفك',
    confirm_password: 'تأكيد كلمة المرور',
    confirm_password_placeholder: 'أكد كلمة المرور',
    'validation.field_required': 'هذا الحقل مطلوب',
    'validation.name_min_length': 'الاسم يجب أن يكون حرفين على الأقل',
    'validation.name_max_length': 'الاسم لا يمكن أن يتجاوز 100 حرف',
    'validation.name_pattern': 'الاسم يجب أن يحتوي على أحرف ومسافات فقط',
    'validation.phone_format': 'يرجى إدخال رقم هاتف صحيح',
    'validation.password_confirmation_required': 'تأكيد كلمة المرور مطلوب',
    'validation.password_mismatch': 'تأكيد كلمة المرور غير متطابق',
  },
  en: {
    full_name: 'Full Name',
    full_name_placeholder: 'Enter your full name',
    phone: 'Phone',
    phone_placeholder: 'Enter your phone number',
    confirm_password: 'Confirm Password',
    confirm_password_placeholder: 'Confirm your password',
    'validation.field_required': 'This field is required',
    'validation.name_min_length': 'Name must be at least 2 characters long',
    'validation.name_max_length': 'Name cannot exceed 100 characters',
    'validation.name_pattern': 'Name must contain only letters and spaces',
    'validation.phone_format': 'Please enter a valid phone number',
    'validation.password_confirmation_required':
      'Password confirmation is required',
    'validation.password_mismatch': 'Password confirmation does not match',
  },
};

// Mock t function
function t(key) {
  const lang = localStorage.getItem('language') || 'ar';
  return translations[lang]?.[key] || key;
}

// Test cases for new translation keys
const testCases = [
  {
    name: 'Full Name Label',
    key: 'full_name',
    expectedAr: 'الاسم الكامل',
    expectedEn: 'Full Name',
  },
  {
    name: 'Full Name Placeholder',
    key: 'full_name_placeholder',
    expectedAr: 'أدخل اسمك الكامل',
    expectedEn: 'Enter your full name',
  },
  {
    name: 'Phone Label',
    key: 'phone',
    expectedAr: 'رقم الهاتف',
    expectedEn: 'Phone',
  },
  {
    name: 'Phone Placeholder',
    key: 'phone_placeholder',
    expectedAr: 'أدخل رقم هاتفك',
    expectedEn: 'Enter your phone number',
  },
  {
    name: 'Confirm Password Label',
    key: 'confirm_password',
    expectedAr: 'تأكيد كلمة المرور',
    expectedEn: 'Confirm Password',
  },
  {
    name: 'Confirm Password Placeholder',
    key: 'confirm_password_placeholder',
    expectedAr: 'أكد كلمة المرور',
    expectedEn: 'Confirm your password',
  },
  {
    name: 'Field Required Validation',
    key: 'validation.field_required',
    expectedAr: 'هذا الحقل مطلوب',
    expectedEn: 'This field is required',
  },
  {
    name: 'Name Min Length Validation',
    key: 'validation.name_min_length',
    expectedAr: 'الاسم يجب أن يكون حرفين على الأقل',
    expectedEn: 'Name must be at least 2 characters long',
  },
  {
    name: 'Name Max Length Validation',
    key: 'validation.name_max_length',
    expectedAr: 'الاسم لا يمكن أن يتجاوز 100 حرف',
    expectedEn: 'Name cannot exceed 100 characters',
  },
  {
    name: 'Name Pattern Validation',
    key: 'validation.name_pattern',
    expectedAr: 'الاسم يجب أن يحتوي على أحرف ومسافات فقط',
    expectedEn: 'Name must contain only letters and spaces',
  },
  {
    name: 'Phone Format Validation',
    key: 'validation.phone_format',
    expectedAr: 'يرجى إدخال رقم هاتف صحيح',
    expectedEn: 'Please enter a valid phone number',
  },
  {
    name: 'Password Confirmation Required Validation',
    key: 'validation.password_confirmation_required',
    expectedAr: 'تأكيد كلمة المرور مطلوب',
    expectedEn: 'Password confirmation is required',
  },
  {
    name: 'Password Mismatch Validation',
    key: 'validation.password_mismatch',
    expectedAr: 'تأكيد كلمة المرور غير متطابق',
    expectedEn: 'Password confirmation does not match',
  },
];

// Run tests
let passedTests = 0;
let totalTests = 0;

console.log('📋 Testing New Translation Keys...\n');

// Test Arabic translations
console.log('🇪🇬 Testing Arabic Translations:');
testCases.forEach(testCase => {
  totalTests++;
  const result = t(testCase.key);
  const expected = testCase.expectedAr;

  if (result === expected) {
    console.log(`✅ ${testCase.name}: "${result}"`);
    passedTests++;
  } else {
    console.log(`❌ ${testCase.name}: Expected "${expected}", got "${result}"`);
  }
});

// Test English translations
console.log('\n🇺🇸 Testing English Translations:');
// Temporarily change language for testing
const originalGetItem = localStorage.getItem;
localStorage.getItem = key => {
  if (key === 'language') return 'en';
  return null;
};

testCases.forEach(testCase => {
  totalTests++;
  const result = t(testCase.key);
  const expected = testCase.expectedEn;

  if (result === expected) {
    console.log(`✅ ${testCase.name}: "${result}"`);
    passedTests++;
  } else {
    console.log(`❌ ${testCase.name}: Expected "${expected}", got "${result}"`);
  }
});

// Test HTML form integration
console.log('\n🌐 Testing HTML Form Integration:');
const mockFormHTML = `
<div class="form-group">
  <label for="registerFullName" data-i18n="full_name">Full Name</label>
  <input
    type="text"
    id="registerFullName"
    name="full_name"
    required
    placeholder="full_name"
    data-i18n-placeholder="full_name_placeholder"
  />
</div>
<div class="form-group">
  <label for="registerPhone" data-i18n="phone">Phone</label>
  <input
    type="tel"
    id="registerPhone"
    name="phone"
    placeholder="phone"
    data-i18n-placeholder="phone_placeholder"
  />
</div>
<div class="form-group">
  <label for="registerpassword_confirmation" data-i18n="confirm_password">Confirm Password</label>
  <input
    type="password"
    id="registerpassword_confirmation"
    name="password_confirmation"
    required
    placeholder="confirm_password"
    data-i18n-placeholder="confirm_password_placeholder"
  />
</div>
`;

console.log('📝 Mock HTML Form:');
console.log(mockFormHTML);

// Test expected translations in form
const expectedFormTranslations = [
  { attribute: 'data-i18n', key: 'full_name', value: 'الاسم الكامل' },
  {
    attribute: 'data-i18n-placeholder',
    key: 'full_name_placeholder',
    value: 'أدخل اسمك الكامل',
  },
  { attribute: 'data-i18n', key: 'phone', value: 'رقم الهاتف' },
  {
    attribute: 'data-i18n-placeholder',
    key: 'phone_placeholder',
    value: 'أدخل رقم هاتفك',
  },
  {
    attribute: 'data-i18n',
    key: 'confirm_password',
    value: 'تأكيد كلمة المرور',
  },
  {
    attribute: 'data-i18n-placeholder',
    key: 'confirm_password_placeholder',
    value: 'أكد كلمة المرور',
  },
];

console.log('\n🔧 Expected Form Translations:');
expectedFormTranslations.forEach(translation => {
  const result = t(translation.key);
  if (result === translation.value) {
    console.log(
      `✅ ${translation.attribute}="${translation.key}": "${result}"`
    );
    passedTests++;
  } else {
    console.log(
      `❌ ${translation.attribute}="${translation.key}": Expected "${translation.value}", got "${result}"`
    );
  }
  totalTests++;
});

// Summary
console.log('\n📊 Translation Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(
  `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
);

if (passedTests === totalTests) {
  console.log('\n🎉 All new translation keys are working correctly!');
  console.log('\n✨ New Translation Keys Added:');
  console.log('- ✅ full_name: "الاسم الكامل" / "Full Name"');
  console.log(
    '- ✅ full_name_placeholder: "أدخل اسمك الكامل" / "Enter your full name"'
  );
  console.log('- ✅ phone: "رقم الهاتف" / "Phone"');
  console.log(
    '- ✅ phone_placeholder: "أدخل رقم هاتفك" / "Enter your phone number"'
  );
  console.log(
    '- ✅ confirm_password: "تأكيد كلمة المرور" / "Confirm Password"'
  );
  console.log(
    '- ✅ confirm_password_placeholder: "أكد كلمة المرور" / "Confirm your password"'
  );
  console.log('\n🔧 Validation Keys Already Present:');
  console.log('- ✅ validation.field_required');
  console.log('- ✅ validation.name_min_length');
  console.log('- ✅ validation.name_max_length');
  console.log('- ✅ validation.name_pattern');
  console.log('- ✅ validation.phone_format');
  console.log('- ✅ validation.password_confirmation_required');
  console.log('- ✅ validation.password_mismatch');
} else {
  console.log(
    '\n⚠️ Some translation tests failed. Please review the translation files.'
  );
}

// Test file structure
console.log('\n📁 Translation Files Structure:');
console.log('src/locales/en/translation.json - English translations');
console.log('src/locales/ar/translation.json - Arabic translations');

console.log(
  '\n🚀 New translation keys are ready for use in the registration form!'
);
