/**
 * Error handling utilities and custom error classes
 */
const logger = require('./logger');

/**
 * Base application error class
 */
class AppError extends Error {
  /**
   * Create a new AppError
   *
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [translationKey] - Key for i18n translation
   * @param {Object} [data] - Additional error data
   */
  constructor(message, statusCode = 500, translationKey = '', data = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.translationKey = translationKey || `errors.${statusCode}`;
    this.data = data;
    this.isOperational = true; // Indicates this is an expected, operational error

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request error
 */
class BadRequestError extends AppError {
  constructor(
    message = 'Bad request',
    translationKey = 'errors.bad_request',
    data = {}
  ) {
    super(message, 400, translationKey, data);
  }
}

/**
 * 401 Unauthorized error
 */
class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    translationKey = 'errors.unauthorized',
    data = {}
  ) {
    super(message, 401, translationKey, data);
  }
}

/**
 * 403 Forbidden error
 */
class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden',
    translationKey = 'errors.forbidden',
    data = {}
  ) {
    super(message, 403, translationKey, data);
  }
}

/**
 * 404 Not Found error
 */
class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    translationKey = 'errors.not_found',
    data = {}
  ) {
    super(message, 404, translationKey, data);
  }
}

/**
 * 409 Conflict error
 */
class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict',
    translationKey = 'errors.conflict',
    data = {}
  ) {
    super(message, 409, translationKey, data);
  }
}

/**
 * 400 Validation error
 */
class ValidationError extends AppError {
  constructor(
    message = 'Validation error',
    translationKey = 'errors.validation',
    data = {}
  ) {
    super(message, 400, translationKey, data);
  }
}

/**
 * 429 Too Many Requests error
 */
class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests',
    translationKey = 'errors.too_many_requests',
    data = {}
  ) {
    super(message, 429, translationKey, data);
  }
}

/**
 * Authentication error (401)
 */
class AuthenticationError extends UnauthorizedError {
  constructor(
    message = 'Authentication failed',
    translationKey = 'errors.authentication',
    data = {}
  ) {
    super(message, translationKey, data);
  }
}

/**
 * Authorization error (403)
 */
class AuthorizationError extends ForbiddenError {
  constructor(
    message = 'Not authorized',
    translationKey = 'errors.authorization',
    data = {}
  ) {
    super(message, translationKey, data);
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(
    message = 'Database error',
    translationKey = 'errors.database',
    data = {}
  ) {
    super(message, 500, translationKey, data);
  }
}

/**
 * Async handler to catch errors in async route handlers
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Something went wrong';
  let translationKey = err.translationKey || 'errors.server_error';
  const errorData = err.data || {};

  // For development, log the error
  if (process.env.NODE_ENV === 'development') {
    logger.error('Error details:', {
      message: err.message,
      stack: err.stack,
      ...errorData,
    });
  } else {
    // For production, log minimally but with request info
    logger.error(`${statusCode} error:`, {
      message: err.message,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      ...(err.isOperational ? {} : { stack: err.stack }),
    });
  }

  // Handle specific error types from external libraries
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
    translationKey = 'errors.invalid_token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
    translationKey = 'errors.token_expired';
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = 400;
    errorMessage = 'Invalid JSON';
    translationKey = 'errors.invalid_json';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    errorMessage = 'Database constraint violation';
    translationKey = 'errors.data_constraint';
  }

  // Determine if this is an API or HTML request
  const isApiRequest =
    req.originalUrl.startsWith('/api') ||
    req.accepts(['html', 'json']) === 'json';

  // Handle API errors with JSON response
  if (isApiRequest) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message: req.t
          ? req.t(translationKey, { defaultValue: errorMessage })
          : errorMessage,
        code: statusCode,
        ...(process.env.NODE_ENV === 'development'
          ? {
              stack: err.stack,
              details: errorData,
            }
          : {}),
      },
    });
  }

  // For HTML requests, render an error page
  res.status(statusCode);

  // Check if we have an error view
  if (req.app.get('view engine')) {
    return res.render('error', {
      message: req.t
        ? req.t(translationKey, { defaultValue: errorMessage })
        : errorMessage,
      error: process.env.NODE_ENV === 'development' ? err : {},
      statusCode,
    });
  }

  // Fallback to basic HTML
  res.send(`
    <html>
      <head>
        <title>Error - ${statusCode}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #d32f2f; }
          .error-code { display: inline-block; background: #f8d7da; padding: 5px 10px; border-radius: 3px; }
          .back-btn { display: inline-block; margin-top: 20px; padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p class="error-code">${statusCode}</p>
        <p>${errorMessage}</p>
        ${process.env.NODE_ENV === 'development' ? `<pre>${err.stack}</pre>` : ''}
        <a class="back-btn" href="javascript:history.back()">Go Back</a>
      </body>
    </html>
  `);
};

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  asyncHandler,
  globalErrorHandler,
};
