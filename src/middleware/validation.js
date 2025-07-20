const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const appointmentSchema = Joi.object({
  employee_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FF\s]+$/) // Arabic text only
    .required()
    .messages({
      'string.pattern.base': 'validation.arabic_text_required',
      'string.min': 'validation.text_min_length_2',
      'string.max': 'validation.text_max_length_100',
      'any.required': 'validation.field_required',
    }),

  employee_id: Joi.string()
    .pattern(/^[A-Z0-9]{3,10}$/)
    .required()
    .messages({
      'string.pattern.base': 'validation.employee_id_format',
      'any.required': 'validation.field_required',
    }),

  department_id: Joi.number().integer().positive().required().messages({
    'number.base': 'validation.field_required',
    'number.integer': 'validation.field_required',
    'number.positive': 'validation.field_required',
    'any.required': 'validation.field_required',
  }),

  location_id: Joi.number().integer().positive().required().messages({
    'number.base': 'validation.field_required',
    'number.integer': 'validation.field_required',
    'number.positive': 'validation.field_required',
    'any.required': 'validation.field_required',
  }),

  title: Joi.string().min(5).max(200).required().messages({
    'string.min': 'title_validation_length',
    'string.max': 'validation.text_max_length_200',
    'any.required': 'validation.field_required',
  }),

  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'validation.text_max_length_1000',
  }),

  requested_date: Joi.date().min('now').required().messages({
    'date.base': 'validation.date_format',
    'date.min': 'validation.date_time_future',
    'any.required': 'validation.field_required',
  }),

  requested_time: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'validation.time_format',
      'any.required': 'validation.field_required',
    }),
});

const appointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'done', 'missed')
    .required()
    .messages({
      'any.only': 'validation.status_invalid',
      'any.required': 'validation.field_required',
    }),

  approved_date: Joi.when('status', {
    is: 'approved',
    then: Joi.date().min('now').required(),
    otherwise: Joi.date().optional(),
  }).messages({
    'date.base': 'validation.date_format',
    'date.min': 'validation.date_time_future',
    'any.required': 'validation.field_required',
  }),

  approved_time: Joi.when('status', {
    is: 'approved',
    then: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'string.pattern.base': 'validation.time_format',
    'any.required': 'validation.field_required',
  }),

  rejection_reason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'string.min': 'validation.rejection_reason_min',
    'any.required': 'validation.field_required',
  }),

  admin_notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'validation.text_max_length_500',
  }),
});

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.min': 'validation.username_min',
    'string.max': 'validation.username_max',
    'any.required': 'validation.field_required',
  }),

  password: Joi.string().min(6).required().messages({
    'string.min': 'validation.password_min',
    'any.required': 'validation.field_required',
  }),
});

const userSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'validation.username_pattern',
      'string.min': 'validation.username_min',
      'string.max': 'validation.username_max',
      'any.required': 'validation.field_required',
    }),

  password: Joi.string().min(6).required().messages({
    'string.min': 'validation.password_min',
    'any.required': 'validation.field_required',
  }),

  email: Joi.string().email().optional().messages({
    'string.email': 'validation.email_format',
  }),

  role: Joi.string().valid('employee', 'admin').default('employee').messages({
    'any.only': 'validation.role_invalid',
  }),

  department_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'validation.field_required',
    'number.integer': 'validation.field_required',
    'number.positive': 'validation.field_required',
  }),
});

const recurringAppointmentSchema = Joi.object({
  type: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'yearly')
    .required()
    .messages({
      'any.only': 'validation.recurring_type_invalid',
      'any.required': 'validation.field_required',
    }),

  interval: Joi.number().integer().min(1).max(52).default(1).messages({
    'number.base': 'validation.field_required',
    'number.integer': 'validation.field_required',
    'number.min': 'validation.interval_min',
    'number.max': 'validation.interval_max',
  }),

  daysOfWeek: Joi.when('type', {
    is: 'weekly',
    then: Joi.array().items(Joi.number().min(0).max(6)).min(1).required(),
    otherwise: Joi.array().optional(),
  }).messages({
    'array.min': 'validation.days_of_week_min',
    'any.required': 'validation.field_required',
  }),

  startDate: Joi.date().min('now').required().messages({
    'date.base': 'validation.date_format',
    'date.min': 'validation.date_time_future',
    'any.required': 'validation.field_required',
  }),

  endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
    'date.base': 'validation.date_format',
    'date.min': 'validation.end_date_after_start',
  }),

  maxOccurrences: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'validation.field_required',
    'number.integer': 'validation.field_required',
    'number.min': 'validation.max_occurrences_min',
    'number.max': 'validation.max_occurrences_max',
  }),
});

// Validation middleware factory
const validate = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation failed', {
        errors: errorMessages,
        body: req.body,
      });

      return res.status(400).json({
        success: false,
        message: 'error.validation',
        errors: errorMessages,
        errorCode: 'VALIDATION_ERROR',
      });
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Export validation functions
module.exports = {
  validateAppointment: validate(appointmentSchema),
  validateAppointmentStatus: validate(appointmentStatusSchema),
  validateRecurringAppointment: validate(recurringAppointmentSchema),
  validateLogin: validate(loginSchema),
  validateUser: validate(userSchema),

  // Export schemas for testing
  appointmentSchema,
  appointmentStatusSchema,
  recurringAppointmentSchema,
  loginSchema,
  userSchema,
};
