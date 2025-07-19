require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    database: {
        path: process.env.DB_PATH || './scheduling.db',
        mode: process.env.DB_MODE || 'development',
        backup: {
            enabled: process.env.DB_BACKUP_ENABLED === 'true',
            interval: process.env.DB_BACKUP_INTERVAL || '0 2 * * *', // Daily at 2 AM
            retention: parseInt(process.env.DB_BACKUP_RETENTION) || 30 // days
        }
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    session: {
        secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: 'Too many requests from this IP, please try again later.'
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
        maxSize: process.env.LOG_MAX_SIZE || '5m'
    },
    
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        },
        from: process.env.EMAIL_FROM || 'noreply@scheduling-system.com',
        templates: {
            appointmentConfirmation: 'appointment-confirmation',
            appointmentReminder: 'appointment-reminder',
            statusUpdate: 'status-update',
            adminNotification: 'admin-notification'
        }
    },
    
    realtime: {
        enabled: process.env.REALTIME_ENABLED === 'true',
        cors: {
            origin: process.env.REALTIME_CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    },
    
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        type: process.env.CACHE_TYPE || 'memory', // memory, redis
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || null,
            db: parseInt(process.env.REDIS_DB) || 0
        },
        memory: {
            ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
            maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
        }
    },
    
    fileUpload: {
        enabled: process.env.FILE_UPLOAD_ENABLED === 'true',
        maxSize: parseInt(process.env.FILE_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedTypes: process.env.FILE_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
        uploadDir: process.env.FILE_UPLOAD_DIR || './uploads',
        tempDir: process.env.FILE_TEMP_DIR || './temp'
    },
    
    notifications: {
        email: {
            enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
            reminders: {
                enabled: process.env.EMAIL_REMINDERS_ENABLED === 'true',
                advanceHours: parseInt(process.env.EMAIL_REMINDER_HOURS) || 24
            }
        },
        push: {
            enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
            vapidKeys: {
                publicKey: process.env.VAPID_PUBLIC_KEY || '',
                privateKey: process.env.VAPID_PRIVATE_KEY || ''
            }
        },
        sms: {
            enabled: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
            provider: process.env.SMS_PROVIDER || 'twilio',
            twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID || '',
                authToken: process.env.TWILIO_AUTH_TOKEN || '',
                fromNumber: process.env.TWILIO_FROM_NUMBER || ''
            }
        }
    },
    
    analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        retention: parseInt(process.env.ANALYTICS_RETENTION) || 90, // days
        realtime: process.env.ANALYTICS_REALTIME === 'true'
    },
    
    security: {
        twoFactor: {
            enabled: process.env.TWO_FACTOR_ENABLED === 'true',
            issuer: process.env.TWO_FACTOR_ISSUER || 'Scheduling System'
        },
        audit: {
            enabled: process.env.AUDIT_ENABLED === 'true',
            retention: parseInt(process.env.AUDIT_RETENTION) || 365 // days
        },
        ipWhitelist: {
            enabled: process.env.IP_WHITELIST_ENABLED === 'true',
            ips: process.env.IP_WHITELIST_IPS?.split(',') || []
        }
    },
    
    timezone: {
        default: process.env.DEFAULT_TIMEZONE || 'Asia/Riyadh',
        format: process.env.TIME_FORMAT || 'YYYY-MM-DD HH:mm:ss'
    },
    
    features: {
        recurringAppointments: process.env.FEATURE_RECURRING_APPOINTMENTS === 'true',
        advancedSearch: process.env.FEATURE_ADVANCED_SEARCH === 'true',
        calendarIntegration: process.env.FEATURE_CALENDAR_INTEGRATION === 'true',
        mobileApp: process.env.FEATURE_MOBILE_APP === 'true',
        darkMode: process.env.FEATURE_DARK_MODE === 'true',
        accessibility: process.env.FEATURE_ACCESSIBILITY === 'true'
    }
}; 