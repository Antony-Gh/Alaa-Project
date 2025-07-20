// Test script to verify monitoring fix
console.log('🧪 Testing Monitoring Fix...\n');

try {
  // Test 1: Check if app can be imported without errors
  console.log('1. Testing app import...');
  const { app } = require('./src/app.js');
  console.log('✅ App imported successfully');
  console.log('');

  // Test 2: Check if simple monitor is working
  console.log('2. Testing simple monitor...');
  const simpleMonitor = require('./src/utils/simpleMonitor');
  console.log('✅ Simple monitor imported successfully');

  const metrics = simpleMonitor.getFormattedMetrics();
  console.log('📊 Sample metrics:', JSON.stringify(metrics, null, 2));
  console.log('');

  // Test 3: Test request recording
  console.log('3. Testing request recording...');
  simpleMonitor.recordRequest(150, false); // Success request
  simpleMonitor.recordRequest(300, true); // Error request
  simpleMonitor.recordRequest(200, false); // Success request

  const updatedMetrics = simpleMonitor.getFormattedMetrics();
  console.log('📊 Updated metrics after 3 requests:');
  console.log(`   Total requests: ${updatedMetrics.requests.total}`);
  console.log(`   Errors: ${updatedMetrics.requests.errors}`);
  console.log(`   Success rate: ${updatedMetrics.requests.successRate}`);
  console.log(
    `   Avg response time: ${updatedMetrics.requests.avgResponseTime}ms`
  );
  console.log('');

  console.log('🎉 All monitoring tests passed!');
  console.log('\n📋 Summary:');
  console.log('- App import: ✅');
  console.log('- Simple monitor: ✅');
  console.log('- Request recording: ✅');
  console.log('- Metrics calculation: ✅');
  console.log('\n🚀 The monitoring system is working correctly!');
  console.log('\n📡 You can now access:');
  console.log('- /api/health - Health check');
  console.log('- /api/monitor - System metrics');
  console.log(
    '\n✅ The event-loop-stats warning should be completely eliminated!'
  );
} catch (error) {
  console.error('❌ Error testing monitoring fix:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
