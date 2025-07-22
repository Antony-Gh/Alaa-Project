const Joi = require('joi');
require('dotenv').config();

const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5000),

  // Database
  DB_PATH: Joi.string().default('./scheduling.db'),

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
    path: envVars.DB_PATH,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  cache: {
    type: envVars.CACHE_TYPE,
    ttl: envVars.CACHE_TTL,
    redis: {
      url: envVars.REDIS_URL,
    },
  },

  email: {
    host: envVars.EMAIL_HOST,
    port: envVars.EMAIL_PORT,
    auth: {
      user: envVars.EMAIL_USER,
      pass: envVars.EMAIL_PASS,
    },
  },

  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW,
      max: envVars.RATE_LIMIT_MAX,
    },
  },

  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    path: envVars.UPLOAD_PATH,
  },
};

module.exports = config;
