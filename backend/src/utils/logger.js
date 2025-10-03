import winston from 'winston';
import fs from 'fs';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Custom format for console logging
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

// Custom format for file logging
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Function to safely create logs directory
const ensureLogsDirectory = () => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn('Unable to create logs directory, using console logging only:', error.message);
    return false;
  }
};

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'grepmind-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add file logging in production if possible
if (process.env.NODE_ENV === 'production') {
  const canCreateLogs = ensureLogsDirectory();
  
  if (canCreateLogs) {
    try {
      logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: fileFormat,
        })
      );
      
      logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: fileFormat,
        })
      );
      
      logger.info('File logging enabled');
    } catch (error) {
      logger.warn('File logging disabled due to permissions:', error.message);
    }
  } else {
    logger.warn('File logging disabled - using console logging only');
  }
}

// Create stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;