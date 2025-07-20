const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up express-status-monitor dependency...\n');

try {
  // Check if express-status-monitor is still in package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasStatusMonitor =
    packageJson.dependencies &&
    packageJson.dependencies['express-status-monitor'];

  if (hasStatusMonitor) {
    console.log('❌ express-status-monitor still found in package.json');
    console.log('Please remove it manually from package.json dependencies');
    process.exit(1);
  }

  console.log('✅ express-status-monitor removed from package.json');

  // Remove node_modules and package-lock.json
  console.log('\n🗑️ Removing node_modules and package-lock.json...');
  if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true, force: true });
    console.log('✅ node_modules removed');
  }

  if (fs.existsSync('package-lock.json')) {
    fs.unlinkSync('package-lock.json');
    console.log('✅ package-lock.json removed');
  }

  // Reinstall dependencies
  console.log('\n📦 Reinstalling dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies reinstalled successfully');

  console.log('\n🎉 Cleanup completed!');
  console.log('📋 Next steps:');
  console.log('1. Run: node test-monitor-fix.js');
  console.log('2. Start your server: npm start');
  console.log('3. The event-loop-stats warning should be gone!');
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}
