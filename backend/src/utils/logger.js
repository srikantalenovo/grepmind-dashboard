import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = 'logs';

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about these colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add request logging format
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta);
};

// Add structured logging methods
logger.logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

logger.logRequest = (req, res, duration) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });
};

logger.logApiCall = (endpoint, method, duration, statusCode, userId = null) => {
  logger.info(`API Call: ${method} ${endpoint}`, {
    endpoint,
    method,
    duration: `${duration}ms`,
    statusCode,
    userId
  });
};

logger.logDatabaseQuery = (query, duration, error = null) => {
  if (error) {
    logger.error(`Database Query Error: ${query}`, {
      query,
      duration: `${duration}ms`,
      error: error.message
    });
  } else {
    logger.debug(`Database Query: ${query}`, {
      query,
      duration: `${duration}ms`
    });
  }
};

logger.logKubernetesOperation = (operation, resource, namespace = null, success = true, error = null) => {
  const logData = {
    operation,
    resource,
    namespace,
    success,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logData.error = error.message;
    logger.error(`Kubernetes Operation Failed: ${operation} ${resource}`, logData);
  } else {
    logger.info(`Kubernetes Operation: ${operation} ${resource}`, logData);
  }
};

logger.logSecurityEvent = (event, userId = null, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export default logger;