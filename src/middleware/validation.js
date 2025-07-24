/**
 * Validation middleware using express-validator
 */
const { body, query, param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

/**
 * Process validation results and throw error if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));

    throw new ValidationError('Validation failed', 'validation.failed', {
      errors: errorMessages,
    });
  }
  next();
};

/**
 * Common validation rules
 */
const rules = {
  // Auth validations
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscore'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  ],

  register: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscore'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    body('password_confirmation').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[+]?[0-9\s\-()]{8,15}$/)
      .withMessage('Please provide a valid phone number'),
  ],

  // User validations
  createUser: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscore'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('role')
      .optional()
      .isIn(['admin', 'moderator', 'employee'])
      .withMessage('Invalid role specified'),
    body('department_id')
      .optional()
      .isInt()
      .withMessage('Department ID must be an integer'),
  ],

  updateUser: [
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[+]?[0-9\s\-()]{8,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('role')
      .optional()
      .isIn(['admin', 'moderator', 'employee'])
      .withMessage('Invalid role specified'),
    body('department_id')
      .optional()
      .isInt()
      .withMessage('Department ID must be an integer'),
  ],

  // Appointment validations
  createAppointment: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('requested_date')
      .notEmpty()
      .withMessage('Requested date is required')
      .isDate()
      .withMessage('Invalid date format'),
    body('requested_time')
      .notEmpty()
      .withMessage('Requested time is required')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Time must be in HH:MM format'),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('location_id')
      .optional()
      .isInt()
      .withMessage('Location ID must be an integer'),
  ],

  updateAppointment: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('requested_date')
      .optional()
      .isDate()
      .withMessage('Invalid date format'),
    body('requested_time')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Time must be in HH:MM format'),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('location_id')
      .optional()
      .isInt()
      .withMessage('Location ID must be an integer'),
  ],

  // Appointment status validation
  updateAppointmentStatus: [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['pending', 'approved', 'rejected', 'done', 'missed'])
      .withMessage('Invalid status value'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
  ],

  // ID parameter validation
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('ID parameter is required')
      .isInt()
      .withMessage('ID must be an integer'),
  ],

  // Department validations
  createDepartment: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Department name is required')
      .isLength({ max: 100 })
      .withMessage('Department name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('manager_id')
      .optional()
      .isInt()
      .withMessage('Manager ID must be an integer'),
  ],

  // Pagination validations
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort').optional().isString().withMessage('Sort must be a string'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be either "asc" or "desc"'),
  ],
};

// Export validation rules and middleware
module.exports = {
  validate,
  rules,
};
