const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const generalLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests, please try again later',
    });

const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,
      message: 'Too many login attempts, please try again later',
    });

const apiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60,
      message: 'Too many API requests, please try again later',
    });

module.exports = { generalLimiter, authLimiter, apiLimiter }; 