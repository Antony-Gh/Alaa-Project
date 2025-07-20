// Simple test script for validation translation keys
console.log('🌐 Testing Validation Translation Keys (Simple)...\n');

const fs = require('fs');
const path = require('path');

// Read translation files
const enTranslations = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'src/locales/en/translation.json'),
    'utf8'
  )
);
const arTranslations = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'src/locales/ar/translation.json'),
    'utf8'
  )
);

// Validation keys to test
const validationKeys = [
  'validation.field_required',
  'validation.username_pattern',
  'validation.username_min',
  'validation.username_max',
  'validation.password_complexity',
  'validation.password_min_8',
  'validation.password_max_128',
  'validation.password_mismatch',
  'validation.password_confirmation_required',
  'validation.password_required',
  'validation.current_password_required',
  'validation.email_format',
  'validation.email_max_length',
  'validation.name_pattern',
  'validation.name_min_length',
  'validation.name_max_length',
  'validation.phone_format',
  'validation.role_invalid',
  'validation.department_id_invalid',
  'validation.is_active_invalid',
  'validation.permissions_invalid',
  'validation.remember_me_invalid',
  'validation.arabic_text_required',
  'validation.text_min_length_2',
  'validation.text_max_length_100',
  'validation.employee_id_format',
  'validation.location_id_invalid',
  'validation.title_pattern',
  'validation.title_min_length',
  'validation.text_max_length_200',
  'validation.description_pattern',
  'validation.text_max_length_1000',
  'validation.date_format',
  'validation.date_time_future',
  'validation.time_format',
  'validation.status_invalid',
  'validation.rejection_reason_min',
  'validation.text_max_length_500',
  'validation.recurring_type_invalid',
  'validation.interval_min',
  'validation.interval_max',
  'validation.days_of_week_min',
  'validation.end_date_after_start',
  'validation.max_occurrences_min',
  'validation.max_occurrences_max',
  'validation.priority_invalid',
  'validation.category_min_length',
  'validation.category_max_length',
  'validation.attachments_max_5',
  'validation.department_name_pattern',
  'validation.department_name_min',
  'validation.department_name_max',
  'validation.description_max_length',
  'validation.manager_id_invalid',
  'validation.location_name_pattern',
  'validation.location_name_min',
  'validation.location_name_max',
  'validation.address_pattern',
  'validation.address_max_length',
  'validation.capacity_invalid',
  'validation.capacity_min',
  'validation.capacity_max',
  'validation.token_required',
];

// Test function
function testTranslationKey(key, translations, language) {
  if (translations[key]) {
    const translation = translations[key];
    console.log(
      `✅ ${language.toUpperCase()}: ${key} - ${translation.substring(0, 50)}${translation.length > 50 ? '...' : ''}`
    );
    return true;
  } else {
    console.log(`❌ ${language.toUpperCase()}: ${key} - Missing translation`);
    return false;
  }
}

// Run tests
console.log('📋 Testing English Translations...\n');
let englishPassed = 0;
const englishTotal = validationKeys.length;

for (const key of validationKeys) {
  if (testTranslationKey(key, enTranslations, 'EN')) {
    englishPassed++;
  }
}

console.log('\n📋 Testing Arabic Translations...\n');
let arabicPassed = 0;
const arabicTotal = validationKeys.length;

for (const key of validationKeys) {
  if (testTranslationKey(key, arTranslations, 'AR')) {
    arabicPassed++;
  }
}

// Summary
console.log('\n📊 Translation Test Summary:');
console.log(
  `🇺🇸 English: ${englishPassed}/${englishTotal} (${((englishPassed / englishTotal) * 100).toFixed(1)}%)`
);
console.log(
  `🇸🇦 Arabic: ${arabicPassed}/${arabicTotal} (${((arabicPassed / arabicTotal) * 100).toFixed(1)}%)`
);

if (englishPassed === englishTotal && arabicPassed === arabicTotal) {
  console.log('\n🎉 All validation translation keys are working correctly!');
  console.log('\n🔐 Enhanced Features:');
  console.log('- ✅ Password confirmation messages');
  console.log('- ✅ Password complexity requirements');
  console.log('- ✅ Multi-language support (English & Arabic)');
  console.log('- ✅ Comprehensive field validation messages');
  console.log('- ✅ User-friendly error messages');
  console.log('- ✅ Consistent translation structure');
} else {
  console.log(
    '\n⚠️ Some translation keys are missing. Please check the translation files.'
  );
}

// Test specific key examples
console.log('\n📝 Example Translations:');
console.log('Password Mismatch:');
console.log(`  EN: ${enTranslations['validation.password_mismatch']}`);
console.log(`  AR: ${arTranslations['validation.password_mismatch']}`);

console.log('\nPassword Complexity:');
console.log(`  EN: ${enTranslations['validation.password_complexity']}`);
console.log(`  AR: ${arTranslations['validation.password_complexity']}`);

console.log('\nField Required:');
console.log(`  EN: ${enTranslations['validation.field_required']}`);
console.log(`  AR: ${arTranslations['validation.field_required']}`);

// Count total validation keys
const enValidationKeys = Object.keys(enTranslations).filter(key =>
  key.startsWith('validation.')
);
const arValidationKeys = Object.keys(arTranslations).filter(key =>
  key.startsWith('validation.')
);

console.log('\n📈 Statistics:');
console.log(`Total validation keys in English: ${enValidationKeys.length}`);
console.log(`Total validation keys in Arabic: ${arValidationKeys.length}`);
console.log(`Expected validation keys: ${validationKeys.length}`);
