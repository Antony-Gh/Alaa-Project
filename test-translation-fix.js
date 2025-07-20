const fs = require('fs');
const path = require('path');

// Load translation files
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
const publicEnTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/main/en.json'), 'utf8')
);
const publicArTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/main/ar.json'), 'utf8')
);

console.log('🔍 Checking for translation issues...\n');

// Check for missing keys in backend translation files
const enKeys = Object.keys(enTranslations);
const arKeys = Object.keys(arTranslations);

console.log('📊 Backend Translation Statistics:');
console.log(`   English keys: ${enKeys.length}`);
console.log(`   Arabic keys: ${arKeys.length}`);

// Find missing keys in Arabic compared to English
const missingInArabic = enKeys.filter(key => !arKeys.includes(key));
const missingInEnglish = arKeys.filter(key => !enKeys.includes(key));

if (missingInArabic.length > 0) {
  console.log('\n❌ Missing keys in Arabic backend translations:');
  missingInArabic.forEach(key => console.log(`   - ${key}`));
} else {
  console.log('\n✅ All English backend keys have Arabic translations');
}

if (missingInEnglish.length > 0) {
  console.log('\n❌ Missing keys in English backend translations:');
  missingInEnglish.forEach(key => console.log(`   - ${key}`));
} else {
  console.log('\n✅ All Arabic backend keys have English translations');
}

// Check frontend translation files
const publicEnKeys = Object.keys(publicEnTranslations);
const publicArKeys = Object.keys(publicArTranslations);

console.log('\n📊 Frontend Translation Statistics:');
console.log(`   English keys: ${publicEnKeys.length}`);
console.log(`   Arabic keys: ${publicArKeys.length}`);

// Find missing keys in frontend
const missingInPublicArabic = publicEnKeys.filter(
  key => !publicArKeys.includes(key)
);
const missingInPublicEnglish = publicArKeys.filter(
  key => !publicEnKeys.includes(key)
);

if (missingInPublicArabic.length > 0) {
  console.log('\n❌ Missing keys in Arabic frontend translations:');
  missingInPublicArabic.forEach(key => console.log(`   - ${key}`));
} else {
  console.log('\n✅ All English frontend keys have Arabic translations');
}

if (missingInPublicEnglish.length > 0) {
  console.log('\n❌ Missing keys in English frontend translations:');
  missingInPublicEnglish.forEach(key => console.log(`   - ${key}`));
} else {
  console.log('\n✅ All Arabic frontend keys have English translations');
}

// Check for common keys that should exist in both frontend and backend
const commonKeys = [
  'system.ready',
  'welcome',
  'login.success',
  'register.success',
  'appointment.created',
  'appointment.updated',
  'appointment.deleted',
  'department.created',
  'department.updated',
  'department.deleted',
  'location.created',
  'location.updated',
  'location.deleted',
  'user.created',
  'user.updated',
  'user.deleted',
  'auth.login_success',
  'auth.register_success',
  'error.validation',
  'error.internal',
  'error.notfound',
];

console.log('\n🔍 Checking for common keys in both frontend and backend:');
const missingCommonKeys = commonKeys.filter(key => {
  const hasBackend = enKeys.includes(key) && arKeys.includes(key);
  const hasFrontend = publicEnKeys.includes(key) && publicArKeys.includes(key);
  return !hasBackend || !hasFrontend;
});

if (missingCommonKeys.length > 0) {
  console.log('\n❌ Missing common keys:');
  missingCommonKeys.forEach(key => {
    const hasBackend = enKeys.includes(key) && arKeys.includes(key);
    const hasFrontend =
      publicEnKeys.includes(key) && publicArKeys.includes(key);
    console.log(
      `   - ${key}: Backend=${hasBackend ? '✅' : '❌'}, Frontend=${hasFrontend ? '✅' : '❌'}`
    );
  });
} else {
  console.log('\n✅ All common keys are present in both frontend and backend');
}

console.log('\n🎉 Translation check completed!');
