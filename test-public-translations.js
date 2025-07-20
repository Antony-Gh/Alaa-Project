// Test script for public translation files
console.log('🧪 Testing Public Translation Files...\n');

const fs = require('fs');
const path = require('path');

// Read the public translation files
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Test the new translation keys
function testTranslationKeys() {
  console.log('📁 Reading Public Translation Files...\n');

  // Read Arabic translations
  const arTranslations = readJsonFile('./public/main/ar.json');
  if (!arTranslations) {
    console.error('❌ Failed to read Arabic translations');
    return;
  }

  // Read English translations
  const enTranslations = readJsonFile('./public/main/en.json');
  if (!enTranslations) {
    console.error('❌ Failed to read English translations');
    return;
  }

  console.log('✅ Successfully read both translation files\n');

  // Define the new translation keys to test
  const newKeys = [
    'full_name',
    'full_name_placeholder',
    'phone',
    'phone_placeholder',
  ];

  // Test Arabic translations
  console.log('🇪🇬 Testing Arabic Translations:');
  let arPassed = 0;
  let arTotal = 0;

  newKeys.forEach(key => {
    arTotal++;
    if (arTranslations[key]) {
      console.log(`✅ ${key}: "${arTranslations[key]}"`);
      arPassed++;
    } else {
      console.log(`❌ ${key}: Missing`);
    }
  });

  console.log(`\n📊 Arabic: ${arPassed}/${arTotal} keys found\n`);

  // Test English translations
  console.log('🇺🇸 Testing English Translations:');
  let enPassed = 0;
  let enTotal = 0;

  newKeys.forEach(key => {
    enTotal++;
    if (enTranslations[key]) {
      console.log(`✅ ${key}: "${enTranslations[key]}"`);
      enPassed++;
    } else {
      console.log(`❌ ${key}: Missing`);
    }
  });

  console.log(`\n📊 English: ${enPassed}/${enTotal} keys found\n`);

  // Test expected values
  console.log('🔍 Testing Expected Values:');
  const expectedValues = {
    ar: {
      full_name: 'الاسم الكامل',
      full_name_placeholder: 'أدخل اسمك الكامل',
      phone: 'رقم الهاتف',
      phone_placeholder: 'أدخل رقم هاتفك',
    },
    en: {
      full_name: 'Full Name',
      full_name_placeholder: 'Enter your full name',
      phone: 'Phone',
      phone_placeholder: 'Enter your phone number',
    },
  };

  let valueTestsPassed = 0;
  let valueTestsTotal = 0;

  // Test Arabic values
  Object.entries(expectedValues.ar).forEach(([key, expectedValue]) => {
    valueTestsTotal++;
    const actualValue = arTranslations[key];
    if (actualValue === expectedValue) {
      console.log(`✅ Arabic ${key}: "${actualValue}"`);
      valueTestsPassed++;
    } else {
      console.log(
        `❌ Arabic ${key}: Expected "${expectedValue}", got "${actualValue}"`
      );
    }
  });

  // Test English values
  Object.entries(expectedValues.en).forEach(([key, expectedValue]) => {
    valueTestsTotal++;
    const actualValue = enTranslations[key];
    if (actualValue === expectedValue) {
      console.log(`✅ English ${key}: "${actualValue}"`);
      valueTestsPassed++;
    } else {
      console.log(
        `❌ English ${key}: Expected "${expectedValue}", got "${actualValue}"`
      );
    }
  });

  console.log(
    `\n📊 Value Tests: ${valueTestsPassed}/${valueTestsTotal} passed\n`
  );

  // Test existing keys that should still be present
  console.log('🔍 Testing Existing Keys:');
  const existingKeys = ['confirm_password', 'confirm_password_placeholder'];

  let existingTestsPassed = 0;
  let existingTestsTotal = 0;

  existingKeys.forEach(key => {
    existingTestsTotal++;
    if (arTranslations[key] && enTranslations[key]) {
      console.log(`✅ ${key}: Present in both files`);
      existingTestsPassed++;
    } else {
      console.log(`❌ ${key}: Missing in one or both files`);
    }
  });

  console.log(
    `\n📊 Existing Keys: ${existingTestsPassed}/${existingTestsTotal} found\n`
  );

  // Summary
  const totalTests = arTotal + enTotal + valueTestsTotal + existingTestsTotal;
  const totalPassed =
    arPassed + enPassed + valueTestsPassed + existingTestsPassed;

  console.log('📊 Final Test Summary:');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalTests - totalPassed}`);
  console.log(
    `📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`
  );

  if (totalPassed === totalTests) {
    console.log('\n🎉 All public translation keys are working correctly!');
    console.log('\n✨ New Translation Keys Added to Public Files:');
    console.log('- ✅ full_name: "الاسم الكامل" / "Full Name"');
    console.log(
      '- ✅ full_name_placeholder: "أدخل اسمك الكامل" / "Enter your full name"'
    );
    console.log('- ✅ phone: "رقم الهاتف" / "Phone"');
    console.log(
      '- ✅ phone_placeholder: "أدخل رقم هاتفك" / "Enter your phone number"'
    );
    console.log('\n🔧 Existing Keys Verified:');
    console.log('- ✅ confirm_password: Present in both files');
    console.log('- ✅ confirm_password_placeholder: Present in both files');
  } else {
    console.log(
      '\n⚠️ Some translation tests failed. Please review the translation files.'
    );
  }

  // Show file structure
  console.log('\n📁 Public Translation Files Structure:');
  console.log('public/main/ar.json - Arabic translations');
  console.log('public/main/en.json - English translations');

  console.log(
    '\n🚀 Public translation files are ready for use in the registration form!'
  );
}

// Run the tests
testTranslationKeys();
