const Joi = require('joi');
const path = require('path');
require('dotenv').config();

const databasePath = path.resolve(__dirname, '../../data/scheduling.db');

const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5000),

  // Database
  DB_PATH: Joi.string().default(databasePath),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Cache
  CACHE_TYPE: Joi.string().valid('memory', 'redis').default('memory'),
  CACHE_TTL: Joi.number().default(3600),
  REDIS_URL: Joi.string().when('CACHE_TYPE', {
    is: 'redis',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Email
  EMAIL_HOST: Joi.string().default('localhost'),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_USER: Joi.string().allow(''),
  EMAIL_PASS: Joi.string().allow(''),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),

  // File Upload
  MAX_FILE_SIZE: Joi.number().default(5242880), // 5MB
  UPLOAD_PATH: Joi.string().default('./uploads'),
}).unknown();

const { error, value: envVars } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,

  database: {
    path: envVars.DB_PATH || databasePath,
    mode: process.env.DB_MODE || 'development',
    backup: {
      enabled: process.env.DB_BACKUP_ENABLED === 'true',
      interval: process.env.DB_BACKUP_INTERVAL || '0 2 * * *', // Daily at 2 AM
      retention: parseInt(process.env.DB_BACKUP_RETENTION) || 30, // days
    },
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  session: {
    secret:
      process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '5m',
  },

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: envVars.EMAIL_HOST || 'smtp.gmail.com',
    port: envVars.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: envVars.EMAIL_USER || '',
      pass: envVars.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@scheduling-system.com',
    templates: {
      appointmentConfirmation: 'appointment-confirmation',
      appointmentReminder: 'appointment-reminder',
      statusUpdate: 'status-update',
      adminNotification: 'admin-notification',
    },
  },

  realtime: {
    enabled: process.env.REALTIME_ENABLED === 'true',
    cors: {
      origin: process.env.REALTIME_CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  },

  cache: {
    type: envVars.CACHE_TYPE,
    ttl: envVars.CACHE_TTL,
    redis: {
      url: envVars.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0,
    },
    enabled: process.env.CACHE_ENABLED === 'true',
    memory: {
      ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
      maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
    },
  },

  fileUpload: {
    enabled: process.env.FILE_UPLOAD_ENABLED === 'true',
    maxSize: parseInt(process.env.FILE_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: process.env.FILE_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
    ],
    uploadDir: process.env.FILE_UPLOAD_DIR || './uploads',
    tempDir: process.env.FILE_TEMP_DIR || './temp',
  },

  notifications: {
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      reminders: {
        enabled: process.env.EMAIL_REMINDERS_ENABLED === 'true',
        advanceHours: parseInt(process.env.EMAIL_REMINDER_HOURS) || 24,
      },
    },
    push: {
      enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
      vapidKeys: {
        publicKey: process.env.VAPID_PUBLIC_KEY || '',
        privateKey: process.env.VAPID_PRIVATE_KEY || '',
      },
    },
    sms: {
      enabled: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_FROM_NUMBER || '',
      },
    },
  },

  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    retention: parseInt(process.env.ANALYTICS_RETENTION) || 90, // days
    realtime: process.env.ANALYTICS_REALTIME === 'true',
  },

  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW,
      max: envVars.RATE_LIMIT_MAX,
    },
    twoFactor: {
      enabled: process.env.TWO_FACTOR_ENABLED === 'true',
      issuer: process.env.TWO_FACTOR_ISSUER || 'Scheduling System',
    },
    audit: {
      enabled: process.env.AUDIT_ENABLED === 'true',
      retention: parseInt(process.env.AUDIT_RETENTION) || 365, // days
    },
    ipWhitelist: {
      enabled: process.env.IP_WHITELIST_ENABLED === 'true',
      ips: process.env.IP_WHITELIST_IPS?.split(',') || [],
    },
  },

  timezone: {
    default: process.env.DEFAULT_TIMEZONE || 'Egypt/Cairo',
    format: process.env.TIME_FORMAT || 'YYYY-MM-DD HH:mm:ss',
  },

  features: {
    recurringAppointments:
      process.env.FEATURE_RECURRING_APPOINTMENTS === 'true',
    advancedSearch: process.env.FEATURE_ADVANCED_SEARCH === 'true',
    calendarIntegration: process.env.FEATURE_CALENDAR_INTEGRATION === 'true',
    mobileApp: process.env.FEATURE_MOBILE_APP === 'true',
    darkMode: process.env.FEATURE_DARK_MODE === 'true',
    accessibility: process.env.FEATURE_ACCESSIBILITY === 'true',
  },

  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    path: envVars.UPLOAD_PATH,
  },
};

module.exports = config;
