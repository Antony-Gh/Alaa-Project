/**
 * Security middleware for Express application
 */
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const config = require('../config/config');
const logger = require('../utils/logger');
const { TooManyRequestsError } = require('../utils/errorHandler');

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => req.path === '/health',
  handler: (req, res, next) => {
    const err = new TooManyRequestsError(
      'Too many requests, please try again later',
      'errors.too_many_requests'
    );
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    next(err);
  },
});

// More strict rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new TooManyRequestsError(
      'Too many login attempts, please try again later',
      'errors.too_many_login_attempts'
    );
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      username: req.body.username,
    });
    next(err);
  },
});

// API rate limiter for sensitive operations
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new TooManyRequestsError(
      'Too many API requests, please try again later',
      'errors.too_many_api_requests'
    );
    next(err);
  },
});

// Security headers using helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
});

// XSS Prevention
const xssProtection = (req, res, next) => {
  // Custom XSS prevention for request body, query and params
  const sanitizeObject = obj => {
    if (!obj) return obj;

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Basic XSS sanitization
        obj[key] = obj[key]
          .replace(/[<>]/g, match => {
            return match === '<' ? '&lt;' : '&gt;';
          })
          .replace(/javascript:/gi, '');
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    });

    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

// Sanitize user input to prevent NoSQL injection
const sanitizeInput = mongoSanitize({
  replaceWith: '_',
});

// Prevent parameter pollution
const preventParameterPollution = hpp({
  whitelist: [
    // Whitelist parameters that are allowed to be repeated
    'sort',
    'fields',
    'q',
    'tags',
    'ids',
  ],
});

// CSRF protection middleware (for non-API routes)
const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for API routes and GET requests
  if (req.path.startsWith('/api/') || req.method === 'GET') {
    return next();
  }

  // Check for valid CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'];
  const userToken = req.session?.csrfToken;

  if (!csrfToken || !userToken || csrfToken !== userToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      message: req.t ? req.t('errors.csrf') : 'Invalid or missing CSRF token',
    });
  }

  next();
};

// Allow CORS for specific origins
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5000'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'Accept-Language',
  ],
  credentials: true,
  maxAge: 600, // 10 minutes
};

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  securityHeaders,
  sanitizeInput,
  xssClean,
  xssProtection,
  preventParameterPollution,
  csrfProtection,
  corsOptions,
};
