const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

// Appointment creation rate limiter (more restrictive)
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 appointment requests per windowMs
  message: {
    success: false,
    message: 'Too many appointment requests, please try again later',
    errorCode: 'APPOINTMENT_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Appointment rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    res.status(429).json({
      success: false,
      message: 'Too many appointment requests, please try again later',
      errorCode: 'APPOINTMENT_RATE_LIMIT_EXCEEDED',
    });
  },
});

// Admin operations rate limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 admin requests per windowMs
  message: {
    success: false,
    message: 'Too many admin requests, please try again later',
    errorCode: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    res.status(429).json({
      success: false,
      message: 'Too many admin requests, please try again later',
      errorCode: 'ADMIN_RATE_LIMIT_EXCEEDED',
    });
  },
});

// Authentication rate limiter (very restrictive to prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later',
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
    });
  },
});

module.exports = {
  generalLimiter,
  appointmentLimiter,
  adminLimiter,
  authLimiter,
};
