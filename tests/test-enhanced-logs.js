const logger = require('../src/utils/logger');

console.log('🧪 Testing Enhanced Log File Naming...\n');

// Test different log levels to generate logs
logger.info('🚀 Server startup test');
logger.warn('⚠️ Warning message test');
logger.error('❌ Error message test');

// Test with metadata
logger.info('📊 User registration', {
  userId: 999,
  username: 'testuser',
  email: 'test@example.com',
  timestamp: new Date().toISOString(),
});

console.log('\n✅ Enhanced logging test completed!');
console.log('📁 Check the logs directory for new files with enhanced naming.');
