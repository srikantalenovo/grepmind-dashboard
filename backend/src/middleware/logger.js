import logger from '../utils/logger.js';

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.http(`Incoming ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.logRequest(req, res, duration);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// API response time middleware
export const responseTime = (req, res, next) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    res.set('X-Response-Time', `${time.toFixed(2)}ms`);
  });
  
  next();
};

// Request ID middleware
export const requestId = (req, res, next) => {
  const id = Math.random().toString(36).substr(2, 9);
  req.id = id;
  res.set('X-Request-ID', id);
  next();
};