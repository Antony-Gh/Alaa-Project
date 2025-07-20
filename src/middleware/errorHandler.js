const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message, translationKey = null) {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.translationKey = translationKey;
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

// Error handler middleware
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // Preserve the translationKey if it exists
  if (err.translationKey) {
    error.translationKey = err.translationKey;
  }

  // Log error for debugging - use translation key if available
  const logMessage = error.translationKey || error.message;
  logger.error('Error occurred:', {
    message: logMessage,
    translationKey: error.translationKey,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ValidationError(
      req.t ? req.t('error.validation') : 'Validation failed',
      message
    );
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError(
      req.t ? req.t('error.unauthorized') : 'Invalid token'
    );
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError(
      req.t ? req.t('error.unauthorized') : 'Token expired'
    );
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    error = new DatabaseError(
      req.t ? req.t('error.conflict') : 'Database constraint violation',
      err
    );
  }

  if (err.code === 'SQLITE_BUSY') {
    error = new DatabaseError(
      req.t ? req.t('error.internal') : 'Database is busy, please try again',
      err
    );
  }

  if (err.code === 'SQLITE_LOCKED') {
    error = new DatabaseError(
      req.t ? req.t('error.internal') : 'Database is locked, please try again',
      err
    );
  }

  // Handle SQLite foreign key constraint errors
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    error = new ValidationError(
      req.t ? req.t('error.validation') : 'Referenced record does not exist'
    );
  }

  // Handle SQLite unique constraint errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    error = new ValidationError(
      req.t ? req.t('error.conflict') : 'Record already exists'
    );
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  const errorCode = error.errorCode || 'INTERNAL_ERROR';

  // Use i18n for 404 and 500
  if (statusCode === 404 && req.t) message = req.t('error.notfound');
  if (statusCode === 500 && req.t) message = req.t('error.internal');

  // For AuthenticationError, preserve translation key if available
  if (errorCode === 'AUTHENTICATION_ERROR' && error.translationKey) {
    message = error.translationKey;
  }

  // Don't leak error details in production
  const response = {
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? req.t
          ? req.t('error.internal')
          : 'Internal server error'
        : message,
    errorCode,
  };

  // Add additional details in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    if (error.errors) {
      response.errors = error.errors;
    }
    if (error.originalError) {
      response.originalError = error.originalError.message;
    }
  }

  res.status(statusCode).json(response);
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, _next) => {
  // Use i18n for not found message, don't double up "not found"
  const message = req.t ? req.t('error.notfound') : 'Route not found';
  const error = new AppError(message, 404, 'NOT_FOUND');
  _next(error);
};

// Async error wrapper
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
