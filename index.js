// Main entry point for the application
// This file now simply imports and starts the modular application

const app = require('./src/app');

// The app is already configured to start the server
// This file serves as a simple entry point for the application

console.log('🎯 Starting Employee Scheduling System...');
console.log('📁 Using modular architecture with separation of concerns');
console.log('🔧 Features:');
console.log('   - Appointment management');
console.log('   - Department management');
console.log('   - Location management');
console.log('   - RESTful API endpoints');
console.log('   - Database integration');
console.log('   - Error handling');
console.log('   - Graceful shutdown');

module.exports = app;