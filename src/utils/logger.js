const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate timestamp for log files
const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

// Custom pretty print format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(
    ({ timestamp, level, message, service, version, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

      // Add service info if available
      if (service) {
        log += `\n  Service: ${service}`;
      }

      // Add version if available
      if (version) {
        log += `\n  Version: ${version}`;
      }

      // Pretty print meta data
      if (Object.keys(meta).length > 0) {
        log += '\n  Details:';
        Object.keys(meta).forEach(key => {
          const value = meta[key];
          if (typeof value === 'object' && value !== null) {
            log += `\n    ${key}: ${JSON.stringify(value, null, 4).replace(/\n/g, '\n      ')}`;
          } else {
            log += `\n    ${key}: ${value}`;
          }
        });
      }

      return log;
    }
  ),
  winston.format.colorize({ all: true })
);

// Pretty print format for files
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({ timestamp, level, message, service, version, stack, ...meta }) => {
      let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

      // Add service info if available
      if (service) {
        log += `\n  Service: ${service}`;
      }

      // Add version if available
      if (version) {
        log += `\n  Version: ${version}`;
      }

      // Add stack trace for errors
      if (stack) {
        log += `\n  Stack Trace:\n${stack}`;
      }

      // Pretty print meta data
      if (Object.keys(meta).length > 0) {
        log += '\n  Details:';
        Object.keys(meta).forEach(key => {
          const value = meta[key];
          if (typeof value === 'object' && value !== null) {
            log += `\n    ${key}: ${JSON.stringify(value, null, 4).replace(/\n/g, '\n      ')}`;
          } else {
            log += `\n    ${key}: ${value}`;
          }
        });
      }

      return log;
    }
  )
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'scheduling-system',
    version: '1.0.0',
  },
  transports: [
    // Error logs with timestamp
    new winston.transports.File({
      filename: path.join(
        logsDir,
        `scheduling-system_error_${getTimestamp()}.log`
      ),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: fileFormat,
    }),
    // Combined logs with timestamp
    new winston.transports.File({
      filename: path.join(
        logsDir,
        `scheduling-system_combined_${getTimestamp()}.log`
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: fileFormat,
    }),
  ],
});

// Console logging with pretty print for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: message => {
    logger.info(message.trim());
  },
};

module.exports = logger;
