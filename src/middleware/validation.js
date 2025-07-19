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
            'string.pattern.base': 'اسم الموظف يجب أن يكون باللغة العربية',
            'string.min': 'اسم الموظف يجب أن يكون على الأقل حرفين',
            'string.max': 'اسم الموظف يجب أن لا يتجاوز 100 حرف',
            'any.required': 'اسم الموظف مطلوب'
        }),
    
    employee_id: Joi.string()
        .pattern(/^[A-Z0-9]{3,10}$/)
        .required()
        .messages({
            'string.pattern.base': 'رقم الموظف يجب أن يكون 3-10 أحرف وأرقام',
            'any.required': 'رقم الموظف مطلوب'
        }),
    
    department_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'معرف القسم يجب أن يكون رقماً',
            'number.integer': 'معرف القسم يجب أن يكون رقماً صحيحاً',
            'number.positive': 'معرف القسم يجب أن يكون موجباً',
            'any.required': 'معرف القسم مطلوب'
        }),
    
    location_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'معرف الموقع يجب أن يكون رقماً',
            'number.integer': 'معرف الموقع يجب أن يكون رقماً صحيحاً',
            'number.positive': 'معرف الموقع يجب أن يكون موجباً',
            'any.required': 'معرف الموقع مطلوب'
        }),
    
    title: Joi.string()
        .min(5)
        .max(200)
        .required()
        .messages({
            'string.min': 'عنوان الموعد يجب أن يكون على الأقل 5 أحرف',
            'string.max': 'عنوان الموعد يجب أن لا يتجاوز 200 حرف',
            'any.required': 'عنوان الموعد مطلوب'
        }),
    
    description: Joi.string()
        .max(1000)
        .optional()
        .allow('')
        .messages({
            'string.max': 'وصف الموعد يجب أن لا يتجاوز 1000 حرف'
        }),
    
    requested_date: Joi.date()
        .min('now')
        .required()
        .messages({
            'date.base': 'التاريخ المطلوب يجب أن يكون تاريخاً صحيحاً',
            'date.min': 'التاريخ المطلوب يجب أن يكون في المستقبل',
            'any.required': 'التاريخ المطلوب مطلوب'
        }),
    
    requested_time: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
            'string.pattern.base': 'الوقت المطلوب يجب أن يكون بتنسيق HH:MM',
            'any.required': 'الوقت المطلوب مطلوب'
        })
});

const appointmentStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'approved', 'rejected', 'done', 'missed')
        .required()
        .messages({
            'any.only': 'الحالة يجب أن تكون: pending, approved, rejected, done, أو missed',
            'any.required': 'الحالة مطلوبة'
        }),
    
    approved_date: Joi.when('status', {
        is: 'approved',
        then: Joi.date().min('now').required(),
        otherwise: Joi.date().optional()
    }).messages({
        'date.base': 'التاريخ المعتمد يجب أن يكون تاريخاً صحيحاً',
        'date.min': 'التاريخ المعتمد يجب أن يكون في المستقبل',
        'any.required': 'التاريخ المعتمد مطلوب للمواعيد المقبولة'
    }),
    
    approved_time: Joi.when('status', {
        is: 'approved',
        then: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        otherwise: Joi.string().optional()
    }).messages({
        'string.pattern.base': 'الوقت المعتمد يجب أن يكون بتنسيق HH:MM',
        'any.required': 'الوقت المعتمد مطلوب للمواعيد المقبولة'
    }),
    
    rejection_reason: Joi.when('status', {
        is: 'rejected',
        then: Joi.string().min(10).max(500).required(),
        otherwise: Joi.string().optional()
    }).messages({
        'string.min': 'سبب الرفض يجب أن يكون على الأقل 10 أحرف',
        'string.max': 'سبب الرفض يجب أن لا يتجاوز 500 حرف',
        'any.required': 'سبب الرفض مطلوب للمواعيد المرفوضة'
    }),
    
    admin_notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': 'ملاحظات الإدارة يجب أن لا تتجاوز 500 حرف'
        })
});

const loginSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.min': 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم المستخدم يجب أن لا يتجاوز 50 حرف',
            'any.required': 'اسم المستخدم مطلوب'
        }),
    
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'كلمة المرور يجب أن تكون على الأقل 6 أحرف',
            'any.required': 'كلمة المرور مطلوبة'
        })
});

const userSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(50)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
            'string.pattern.base': 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط',
            'string.min': 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم المستخدم يجب أن لا يتجاوز 50 حرف',
            'any.required': 'اسم المستخدم مطلوب'
        }),
    
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'كلمة المرور يجب أن تكون على الأقل 6 أحرف',
            'any.required': 'كلمة المرور مطلوبة'
        }),
    
    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'البريد الإلكتروني يجب أن يكون صحيحاً'
        }),
    
    role: Joi.string()
        .valid('employee', 'admin')
        .default('employee')
        .messages({
            'any.only': 'الدور يجب أن يكون employee أو admin'
        }),
    
    department_id: Joi.number()
        .integer()
        .positive()
        .optional()
        .messages({
            'number.base': 'معرف القسم يجب أن يكون رقماً',
            'number.integer': 'معرف القسم يجب أن يكون رقماً صحيحاً',
            'number.positive': 'معرف القسم يجب أن يكون موجباً'
        })
});

const recurringAppointmentSchema = Joi.object({
    type: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'yearly')
        .required()
        .messages({
            'any.only': 'نوع التكرار يجب أن يكون: daily, weekly, monthly, أو yearly',
            'any.required': 'نوع التكرار مطلوب'
        }),
    
    interval: Joi.number()
        .integer()
        .min(1)
        .max(52)
        .default(1)
        .messages({
            'number.base': 'الفاصل الزمني يجب أن يكون رقماً',
            'number.integer': 'الفاصل الزمني يجب أن يكون رقماً صحيحاً',
            'number.min': 'الفاصل الزمني يجب أن يكون على الأقل 1',
            'number.max': 'الفاصل الزمني يجب أن لا يتجاوز 52'
        }),
    
    daysOfWeek: Joi.when('type', {
        is: 'weekly',
        then: Joi.array().items(Joi.number().min(0).max(6)).min(1).required(),
        otherwise: Joi.array().optional()
    }).messages({
        'array.min': 'يجب تحديد يوم واحد على الأقل للأسبوع',
        'any.required': 'أيام الأسبوع مطلوبة للتكرار الأسبوعي'
    }),
    
    startDate: Joi.date()
        .min('now')
        .required()
        .messages({
            'date.base': 'تاريخ البداية يجب أن يكون تاريخاً صحيحاً',
            'date.min': 'تاريخ البداية يجب أن يكون في المستقبل',
            'any.required': 'تاريخ البداية مطلوب'
        }),
    
    endDate: Joi.date()
        .min(Joi.ref('startDate'))
        .optional()
        .messages({
            'date.base': 'تاريخ النهاية يجب أن يكون تاريخاً صحيحاً',
            'date.min': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
        }),
    
    maxOccurrences: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .messages({
            'number.base': 'الحد الأقصى للتكرار يجب أن يكون رقماً',
            'number.integer': 'الحد الأقصى للتكرار يجب أن يكون رقماً صحيحاً',
            'number.min': 'الحد الأقصى للتكرار يجب أن يكون على الأقل 1',
            'number.max': 'الحد الأقصى للتكرار يجب أن لا يتجاوز 100'
        })
});

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            logger.warn('Validation failed', { 
                errors: errorMessages,
                body: req.body 
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages,
                errorCode: 'VALIDATION_ERROR'
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
    userSchema
}; 