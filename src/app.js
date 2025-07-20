const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
// const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const xss = require('xss-clean');
const hpp = require('hpp');
const expressSanitizer = require('express-sanitizer');
const expressRequestId = require('express-request-id');
// Status monitor disabled due to event-loop-stats compatibility issues
// let statusMonitor;
// try {
//   statusMonitor = require('express-status-monitor');
// } catch (error) {
//   statusMonitor = null;
// }
const http = require('http');

// i18n setup
const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');

// Import configuration and utilities
const config = require('./config/config');
const logger = require('./utils/logger');
const dbManager = require('./utils/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Import services
// const emailService = require('./services/emailService');
const realtimeService = require('./services/realtimeService');
const simpleMonitor = require('./utils/simpleMonitor');

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const rbacRoutes = require('./routes/rbacRoutes');

const app = express();
const server = http.createServer(app);

// i18n initialization
const supportedLngs = ['en', 'ar'];
i18next
  .use(i18nextFsBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'ar',
    preload: supportedLngs,
    supportedLngs,
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/translation.json'),
    },
    detection: {
      order: ['querystring', 'header', 'cookie'],
      lookupQuerystring: 'lang',
      lookupHeader: 'accept-language',
      lookupCookie: 'lang',
      caches: false,
    },
    interpolation: { escapeValue: false },
    debug: false,
  });

// i18n middleware
app.use(
  i18nextMiddleware.handle(i18next, {
    removeLngFromUrl: false,
  })
);

// Make i18n available in all requests (for controllers)
app.use((req, res, next) => {
  req.language = req.language || req.lng || 'ar';
  req.t = req.t || (key => i18next.t(key, { lng: req.language }));
  next();
});

// Initialize real-time service
realtimeService.initialize(server);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
        ],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.socket.io'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Explicitly set X-Frame-Options header
app.use(helmet.frameguard({ action: 'deny' }));

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(xss());
app.use(hpp());
app.use(expressSanitizer());

// Request ID middleware
app.use(expressRequestId());

// Status monitoring replaced with simple monitor
if (config.nodeEnv === 'development') {
  logger.info(
    '✅ Simple monitoring system enabled (replaces express-status-monitor)'
  );
}

// Rate limiting
app.use(generalLimiter);

// Slow down middleware for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes, then...
  delayMs: (used, req) => {
    // Begin adding 500ms of delay per request above 100
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  },
});
app.use(speedLimiter);

// Static files
app.use('/main', express.static(path.join(__dirname, '../public/main')));
app.get('/', (req, res) => {
  res.redirect('/main');
});

// Request logging with pretty print
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log request details
  logger.info('🌐 Incoming Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
    headers: {
      'content-type': req.get('Content-Type'),
      authorization: req.get('Authorization') ? 'Bearer [HIDDEN]' : 'None',
      accept: req.get('Accept'),
    },
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Log response details
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor =
      res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';

    // Record request in simple monitor
    simpleMonitor.recordRequest(duration, res.statusCode >= 400);

    logger.info(`${statusColor} Request Completed`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || '0',
      requestId: req.id,
    });
  });

  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    version: config.features.system_version || '2.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    realtime: {
      enabled: config.realtime.enabled,
      connectedUsers: realtimeService.getConnectedUsersCount(),
    },
    email: {
      enabled: config.email.enabled,
    },
  });
});

// Simple monitoring endpoint (replaces express-status-monitor)
app.get('/api/monitor', (req, res) => {
  res.json({
    success: true,
    data: simpleMonitor.getFormattedMetrics(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/rbac', rbacRoutes);

// Real-time endpoint
app.get('/api/realtime/status', (req, res) => {
  res.json({
    enabled: config.realtime.enabled,
    connectedUsers: realtimeService.getConnectedUsersCount(),
    usersByRole: {
      admin: realtimeService.getConnectedUsersByRole('admin').length,
      employee: realtimeService.getConnectedUsersByRole('employee').length,
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully', {
    signal: 'SIGTERM',
    timestamp: new Date().toISOString(),
  });
  await dbManager.close();
  logger.info('✅ Database connection closed successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully', {
    signal: 'SIGINT',
    timestamp: new Date().toISOString(),
  });
  await dbManager.close();
  logger.info('✅ Database connection closed successfully');
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('💥 Unhandled Promise Rejection', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('💥 Uncaught Exception', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    logger.info('🔧 Initializing database...');
    await dbManager.initialize();
    logger.info('✅ Database initialized successfully');

    // Start server
    server.listen(config.port, () => {
      logger.info('🚀 Server Started Successfully', {
        port: config.port,
        url: `http://localhost:${config.port}/`,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });

      // Start simple monitoring
      simpleMonitor.startPeriodicLogging(300000); // Log metrics every 5 minutes

      logger.info('📋 System Information', {
        service: 'Advanced Employee Scheduling System',
        version: '2.0.0',
        language: 'نظام حجز المواعيد المتقدم جاهز للاستخدام',
        features: [
          'Advanced User Authentication & Authorization',
          'Real-time Notifications & Live Updates',
          'Email Notifications & Reminders',
          'Recurring Appointments',
          'Advanced Search & Filtering',
          'Comprehensive Analytics & Reporting',
          'Enhanced Security & Rate Limiting',
          'File Upload & Attachments',
          'Calendar Integration',
          'Mobile Responsive Design',
          'Dark Mode & Accessibility',
          'Audit Logging & Monitoring',
        ],
      });

      logger.info('🔧 Enabled Features', {
        emailNotifications: config.notifications.email.enabled,
        realtimeNotifications: config.realtime.enabled,
        recurringAppointments: config.features.recurringAppointments,
        advancedSearch: config.features.advancedSearch,
        calendarIntegration: config.features.calendarIntegration,
        darkMode: config.features.darkMode,
        accessibility: config.features.accessibility,
        analytics: config.analytics.enabled,
        twoFactorAuth: config.security.twoFactor.enabled,
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start server', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server };
