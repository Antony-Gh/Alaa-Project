const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextFsBackend = require('i18next-fs-backend');

// Import configurations and utilities
const config = require('./config/config');
const dbManager = require('./utils/database');
const logger = require('./utils/logger');
const { globalErrorHandler } = require('./utils/errorHandler');
const { eventBus, EVENTS } = require('./core/events/eventBus');
const metricsCollector = require('./core/monitoring/metricsCollector');
const licenseManager = require('./core/licensing/licenseManager');

// Import security middleware
const {
  generalLimiter,
  authLimiter,
  apiLimiter,
  sanitizeInput,
  preventParameterPollution,
  securityHeaders,
  xssClean,
  xssProtection,
  corsOptions,
  csrfProtection,
} = require('./middleware/security');

// Import license middleware
const { 
  checkLicense, 
  addLicenseInfoToResponse, 
  checkFeatureAccess 
} = require('./middleware/licenseCheck');

// Import services
const cacheService = require('./services/cacheService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const userRoutes = require('./routes/userRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const licenseRoutes = require('./routes/licenseRoutes');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Compression middleware (must be at the top for best performance)
app.use(
  compression({
    level: 6, // Balance between compression and CPU usage
    threshold: 1024, // Only compress responses larger than 1KB
  })
);

// Security middleware
app.use(securityHeaders); // Apply helmet security headers
app.use(cors(corsOptions)); // Apply CORS with specific options
app.use(generalLimiter); // Rate limiting for all routes
app.use(xssClean()); // XSS sanitization
app.use(xssProtection); // Additional XSS protection
app.use(sanitizeInput); // Input sanitization
app.use(preventParameterPollution); // Prevent parameter pollution

// Body parsing middleware
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for CSRF validation or webhook signatures
      req.rawBody = buf.toString();
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Initialize i18n middleware
const i18nConfig = {
  debug: process.env.NODE_ENV === 'development',
  fallbackLng: 'en',
  preload: ['en', 'ar'],
  ns: ['translation'],
  defaultNS: 'translation',
  backend: {
    loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
  },
};

i18next
  .use(i18nextFsBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init(i18nConfig);

app.use(i18nextMiddleware.handle(i18next));

// CSRF protection for non-API routes
app.use(csrfProtection);

// License middleware for API routes
app.use('/api', checkLicense, addLicenseInfoToResponse);

// Static files with no caching (for development)
app.use(
  express.static(path.join(__dirname, '../src/public'), {
    maxAge: 0,
    etag: false,
    lastModified: false
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '2.0.0',
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/appointments', apiLimiter, appointmentRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/user-management', apiLimiter, userManagementRoutes);
app.use('/api/rbac', apiLimiter, checkFeatureAccess('userManagement'), rbacRoutes);
app.use('/api/analytics', apiLimiter, checkFeatureAccess('analytics'), analyticsRoutes);
app.use('/api/notifications', apiLimiter, checkFeatureAccess('notifications'), notificationRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/license', apiLimiter, licenseRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/main/index.html'));
});

// API Documentation
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const fs = require('fs');
  const apiDocsPath = path.join(__dirname, '../api-docs');
  const swaggerJsonPath = path.join(apiDocsPath, 'swagger.json');
  
  try {
    // Create api-docs directory if it doesn't exist
    if (!fs.existsSync(apiDocsPath)) {
      fs.mkdirSync(apiDocsPath, { recursive: true });
      logger.info('Created API docs directory');
    }
    
    // Create a basic swagger.json if it doesn't exist
    if (!fs.existsSync(swaggerJsonPath)) {
      const basicSwagger = {
        openapi: '3.0.0',
        info: {
          title: 'Scheduling System API',
          version: '1.0.0',
          description: 'API for the scheduling system'
        },
        servers: [
          {
            url: '/api',
            description: 'Development server'
          }
        ],
        paths: {}
      };
      
      fs.writeFileSync(
        swaggerJsonPath, 
        JSON.stringify(basicSwagger, null, 2)
      );
      logger.info('Created basic swagger.json file');
    }
    
    const swaggerDocument = require(swaggerJsonPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info('API documentation available at /api-docs');
  } catch (error) {
    logger.error('Failed to setup API documentation:', error);
  }
}

// 404 handler
app.use('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    // API 404 response
    const error = new Error(
      req.t ? req.t('error.route_not_found') : 'Route not found'
    );
    error.statusCode = 404;
    next(error);
  } else {
    // Web page 404 response
    res.status(404).sendFile(path.join(__dirname, '../public/main/404.html'));
  }
});

// Global error handler
app.use(globalErrorHandler);

// Database initialization
const initializeApp = async () => {
  try {
    // Initialize database
    await dbManager.initialize();

    // Additional startup tasks
    eventBus.emit(EVENTS.APP_STARTED);

    // Start the server
    const PORT = config.port || 5000;
    app.listen(PORT, () => {
      logger.info(`✅ Server running in ${config.env} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to initialize app:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdownGracefully = async signal => {
  logger.info(`${signal} received, shutting down gracefully`);

  // Emit shutdown event for cleanup tasks
  eventBus.emit(EVENTS.APP_SHUTDOWN);

  try {
    // Close database connection
    await dbManager.close();

    // Close cache connection
    await cacheService.close();

    // Allow time for cleanup operations
    setTimeout(() => {
      logger.info('👋 Server shutdown complete');
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', err);
  // Always exit on uncaught exceptions
  process.exit(1);
});

// Initialize the application
if (require.main === module) {
  initializeApp();
}

module.exports = app;
