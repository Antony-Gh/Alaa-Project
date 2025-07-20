const Joi = require('joi');
const logger = require('../utils/logger');
const i18next = require('i18next');

// Validation schemas
const appointmentSchema = Joi.object({
  employee_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FFa-zA-Z\s]+$/) // Arabic and English text
    .required()
    .messages({
      'string.pattern.base': 'validation.name_pattern',
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
    'number.base': 'validation.department_id_invalid',
    'number.integer': 'validation.department_id_invalid',
    'number.positive': 'validation.department_id_invalid',
    'any.required': 'validation.field_required',
  }),

  location_id: Joi.number().integer().positive().required().messages({
    'number.base': 'validation.location_id_invalid',
    'number.integer': 'validation.location_id_invalid',
    'number.positive': 'validation.location_id_invalid',
    'any.required': 'validation.field_required',
  }),

  title: Joi.string()
    .min(5)
    .max(200)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_.,!?()]+$/) // Arabic, English, and common punctuation
    .required()
    .messages({
      'string.pattern.base': 'validation.title_pattern',
      'string.min': 'validation.title_min_length',
      'string.max': 'validation.text_max_length_200',
      'any.required': 'validation.field_required',
    }),

  description: Joi.string()
    .max(1000)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_.,!?()\n\r]*$/) // Allow line breaks
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'validation.description_pattern',
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

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'validation.priority_invalid',
    }),

  category: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'validation.category_min_length',
    'string.max': 'validation.category_max_length',
  }),

  attachments: Joi.array().items(Joi.string()).max(5).optional().messages({
    'array.max': 'validation.attachments_max_5',
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

  password: Joi.string().min(1).required().messages({
    'string.min': 'validation.password_required',
    'any.required': 'validation.field_required',
  }),

  remember_me: Joi.boolean().default(false).messages({
    'boolean.base': 'validation.remember_me_invalid',
  }),
});

const passwordChangeSchema = Joi.object({
  current_password: Joi.string().min(1).required().messages({
    'string.min': 'validation.current_password_required',
    'any.required': 'validation.field_required',
  }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%*?&+=])[A-Za-z\d!@#$%*?&+=]/
    )
    .required()
    .messages({
      'string.pattern.base': 'validation.password_complexity',
      'string.min': 'validation.password_min_8',
      'string.max': 'validation.password_max_128',
      'any.required': 'validation.field_required',
    }),

  new_password_confirmation: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'validation.password_mismatch',
      'any.required': 'validation.password_confirmation_required',
    }),
});

const passwordResetSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .required()
    .messages({
      'string.email': 'validation.email_format',
      'string.max': 'validation.email_max_length',
      'any.required': 'validation.field_required',
    }),
});

const passwordResetConfirmSchema = Joi.object({
  token: Joi.string().min(1).required().messages({
    'string.min': 'validation.token_required',
    'any.required': 'validation.field_required',
  }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%*?&+=])[A-Za-z\d!@#$%*?&+=]/
    )
    .required()
    .messages({
      'string.pattern.base': 'validation.password_complexity',
      'string.min': 'validation.password_min_8',
      'string.max': 'validation.password_max_128',
      'any.required': 'validation.field_required',
    }),

  new_password_confirmation: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'validation.password_mismatch',
      'any.required': 'validation.password_confirmation_required',
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

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%*?&+=])[A-Za-z\d!@#$%*?&+=]/
    )
    .required()
    .messages({
      'string.pattern.base': 'validation.password_complexity',
      'string.min': 'validation.password_min_8',
      'string.max': 'validation.password_max_128',
      'any.required': 'validation.field_required',
    }),

  password_confirmation: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'validation.password_mismatch',
      'any.required': 'validation.password_confirmation_required',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .optional()
    .messages({
      'string.email': 'validation.email_format',
      'string.max': 'validation.email_max_length',
    }),

  full_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FFa-zA-Z\s]+$/) // Arabic and English text
    .required()
    .messages({
      'string.pattern.base': 'validation.name_pattern',
      'string.min': 'validation.name_min_length',
      'string.max': 'validation.name_max_length',
      'any.required': 'validation.field_required',
    }),

  phone: Joi.string()
    .pattern(/^[+]?[0-9\s\-()]{8,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'validation.phone_format',
    }),

  role: Joi.string()
    .valid('employee', 'admin', 'manager', 'moderator')
    .default('employee')
    .messages({
      'any.only': 'validation.role_invalid',
    }),

  department_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'validation.department_id_invalid',
    'number.integer': 'validation.department_id_invalid',
    'number.positive': 'validation.department_id_invalid',
  }),

  is_active: Joi.boolean().default(true).messages({
    'boolean.base': 'validation.is_active_invalid',
  }),

  permissions: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'validation.permissions_invalid',
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
      // Get user's preferred language from request headers or default to 'en'
      const userLanguage = req.get('Accept-Language')?.startsWith('ar')
        ? 'ar'
        : 'en';

      const errorMessages = error.details.map(detail => {
        const field = detail.path.join('.');
        const messageKey = detail.message;

        // Translate the message key to user's language
        const translatedMessage = i18next.t(messageKey, { lng: userLanguage });

        return {
          field,
          message: messageKey, // Keep the key for frontend reference
          translatedMessage, // Add translated message
        };
      });

      logger.warn('Validation failed', {
        errors: errorMessages,
        body: req.body,
        language: userLanguage,
      });

      return res.status(400).json({
        success: false,
        message: i18next.t('error.validation', { lng: userLanguage }),
        errors: errorMessages,
        errorCode: 'VALIDATION_ERROR',
      });
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Additional validation schemas
const departmentSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'validation.department_name_pattern',
      'string.min': 'validation.department_name_min',
      'string.max': 'validation.department_name_max',
      'any.required': 'validation.field_required',
    }),

  description: Joi.string()
    .max(500)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_.,!?()\n\r]*$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'validation.description_pattern',
      'string.max': 'validation.description_max_length',
    }),

  manager_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'validation.manager_id_invalid',
    'number.integer': 'validation.manager_id_invalid',
    'number.positive': 'validation.manager_id_invalid',
  }),

  is_active: Joi.boolean().default(true).messages({
    'boolean.base': 'validation.is_active_invalid',
  }),
});

const locationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'validation.location_name_pattern',
      'string.min': 'validation.location_name_min',
      'string.max': 'validation.location_name_max',
      'any.required': 'validation.field_required',
    }),

  address: Joi.string()
    .max(255)
    .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s\-_.,!?()]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'validation.address_pattern',
      'string.max': 'validation.address_max_length',
    }),

  capacity: Joi.number().integer().min(1).max(1000).optional().messages({
    'number.base': 'validation.capacity_invalid',
    'number.integer': 'validation.capacity_invalid',
    'number.min': 'validation.capacity_min',
    'number.max': 'validation.capacity_max',
  }),

  is_active: Joi.boolean().default(true).messages({
    'boolean.base': 'validation.is_active_invalid',
  }),
});

const profileUpdateSchema = Joi.object({
  full_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[\u0600-\u06FFa-zA-Z\s]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'validation.name_pattern',
      'string.min': 'validation.name_min_length',
      'string.max': 'validation.name_max_length',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .optional()
    .messages({
      'string.email': 'validation.email_format',
      'string.max': 'validation.email_max_length',
    }),

  phone: Joi.string()
    .pattern(/^[+]?[0-9\s\-()]{8,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'validation.phone_format',
    }),

  department_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'validation.department_id_invalid',
    'number.integer': 'validation.department_id_invalid',
    'number.positive': 'validation.department_id_invalid',
  }),
});

// Export validation functions
module.exports = {
  validateAppointment: validate(appointmentSchema),
  validateAppointmentStatus: validate(appointmentStatusSchema),
  validateRecurringAppointment: validate(recurringAppointmentSchema),
  validateLogin: validate(loginSchema),
  validateUser: validate(userSchema),
  validatePasswordChange: validate(passwordChangeSchema),
  validatePasswordReset: validate(passwordResetSchema),
  validatePasswordResetConfirm: validate(passwordResetConfirmSchema),
  validateDepartment: validate(departmentSchema),
  validateLocation: validate(locationSchema),
  validateProfileUpdate: validate(profileUpdateSchema),

  // Export schemas for testing
  appointmentSchema,
  appointmentStatusSchema,
  recurringAppointmentSchema,
  loginSchema,
  userSchema,
  passwordChangeSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  departmentSchema,
  locationSchema,
  profileUpdateSchema,
};
