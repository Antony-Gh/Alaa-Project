// Frontend Configuration
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: '/api',
        ENDPOINTS: {
            AUTH: {
                LOGIN: '/auth/login',
                REGISTER: '/auth/register',
                LOGOUT: '/auth/logout',
                PROFILE: '/auth/profile'
            },
            APPOINTMENTS: {
                BASE: '/appointments',
                STATS: '/appointments/stats',
                BY_STATUS: (status) => `/appointments/status/${status}`
            },
            DEPARTMENTS: {
                BASE: '/departments',
                STATS: '/departments/stats'
            },
            LOCATIONS: {
                BASE: '/locations',
                AVAILABLE: '/locations/available',
                STATS: '/locations/stats'
            }
        },
        TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3
    },

    // UI Configuration
    UI: {
        ANIMATION_DURATION: 300,
        MESSAGE_DISPLAY_TIME: 5000,
        AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
        PAGINATION: {
            DEFAULT_PAGE_SIZE: 20,
            MAX_PAGE_SIZE: 100
        }
    },

    // Validation Configuration
    VALIDATION: {
        PASSWORD: {
            MIN_LENGTH: 8,
            REQUIRE_UPPERCASE: true,
            REQUIRE_LOWERCASE: true,
            REQUIRE_NUMBERS: true,
            REQUIRE_SPECIAL: true
        },
        USERNAME: {
            MIN_LENGTH: 6,
            MAX_LENGTH: 20,
            PATTERN: /^[a-zA-Z0-9_]+$/
        },
        EMAIL: {
            PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        EMPLOYEE_ID: {
            PATTERN: /^[A-Z0-9]{3,10}$/
        }
    },

    // Localization Configuration
    I18N: {
        DEFAULT_LANGUAGE: 'ar',
        SUPPORTED_LANGUAGES: ['ar', 'en'],
        FALLBACK_LANGUAGE: 'ar'
    },

    // Security Configuration
    SECURITY: {
        XSS_PROTECTION: true,
        CSRF_PROTECTION: true,
        CONTENT_SECURITY_POLICY: true
    }
};

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    // Make available globally for browser
    window.CONFIG = CONFIG;
} 