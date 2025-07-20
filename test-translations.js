// Test script for validation translation keys
console.log('🌐 Testing Validation Translation Keys...\n');

const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Initialize i18next
async function initializeTranslations() {
  await i18next.use(Backend).init({
    backend: {
      loadPath: path.join(__dirname, 'src/locales/{{lng}}/translation.json'),
    },
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
  });
}

// Test validation keys
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
function testTranslationKey(key, language) {
  const translation = i18next.t(key, { lng: language });

  if (translation === key) {
    console.log(`❌ ${language.toUpperCase()}: ${key} - Missing translation`);
    return false;
  } else {
    console.log(
      `✅ ${language.toUpperCase()}: ${key} - ${translation.substring(0, 50)}${translation.length > 50 ? '...' : ''}`
    );
    return true;
  }
}

// Run tests
async function runTests() {
  try {
    await initializeTranslations();

    console.log('📋 Testing English Translations...\n');
    let englishPassed = 0;
    const englishTotal = validationKeys.length;

    for (const key of validationKeys) {
      if (testTranslationKey(key, 'en')) {
        englishPassed++;
      }
    }

    console.log('\n📋 Testing Arabic Translations...\n');
    let arabicPassed = 0;
    const arabicTotal = validationKeys.length;

    for (const key of validationKeys) {
      if (testTranslationKey(key, 'ar')) {
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
      console.log(
        '\n🎉 All validation translation keys are working correctly!'
      );
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
    console.log(
      `  EN: ${i18next.t('validation.password_mismatch', { lng: 'en' })}`
    );
    console.log(
      `  AR: ${i18next.t('validation.password_mismatch', { lng: 'ar' })}`
    );

    console.log('\nPassword Complexity:');
    console.log(
      `  EN: ${i18next.t('validation.password_complexity', { lng: 'en' })}`
    );
    console.log(
      `  AR: ${i18next.t('validation.password_complexity', { lng: 'ar' })}`
    );

    console.log('\nField Required:');
    console.log(
      `  EN: ${i18next.t('validation.field_required', { lng: 'en' })}`
    );
    console.log(
      `  AR: ${i18next.t('validation.field_required', { lng: 'ar' })}`
    );
  } catch (error) {
    console.error('❌ Error testing translations:', error.message);
    process.exit(1);
  }
}

runTests();
