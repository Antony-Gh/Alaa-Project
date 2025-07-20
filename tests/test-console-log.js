const logger = require('../src/utils/logger');

console.log('🧪 Testing Console Logging Output...\n');

// Test different log levels
logger.info('🔧 This is an info message');
logger.warn('⚠️ This is a warning message');
logger.error('❌ This is an error message');

// Test with metadata
logger.info('📊 User action completed', {
  userId: 123,
  action: 'appointment_created',
  timestamp: new Date().toISOString(),
});

// Test with complex objects
logger.info('🎯 Complex data example', {
  user: {
    id: 456,
    name: 'Ahmed Mohamed',
    role: 'employee',
  },
  appointment: {
    id: 789,
    title: 'Team Meeting',
    date: '2024-12-25',
    time: '10:00',
  },
  metadata: {
    source: 'web_interface',
    version: '1.0.0',
  },
});

console.log('\n✅ Console logging test completed!');
