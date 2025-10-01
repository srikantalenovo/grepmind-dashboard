import logger from '../utils/logger.js';

// Global error handler
export const errorHandler = (error, req, res, next) => {
  // Log error with context
  logger.logError(error, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || null,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };
  
  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.details || error.message,
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid data format',
      code: 'CAST_ERROR',
      field: error.path,
      timestamp: new Date().toISOString()
    };
  } else if (error.code === 'P2002') {
    // Prisma unique constraint error
    statusCode = 409;
    errorResponse = {
      error: 'Resource already exists',
      code: 'DUPLICATE_ERROR',
      field: error.meta?.target?.[0] || 'unknown',
      timestamp: new Date().toISOString()
    };
  } else if (error.code === 'P2025') {
    // Prisma record not found error
    statusCode = 404;
    errorResponse = {
      error: 'Resource not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    };
  } else if (error.statusCode && error.statusCode < 500) {
    // Client errors
    statusCode = error.statusCode;
    errorResponse = {
      error: error.message || 'Client error',
      code: error.code || 'CLIENT_ERROR',
      timestamp: new Date().toISOString()
    };
  } else if (error.message && process.env.NODE_ENV === 'development') {
    // In development, include error message
    errorResponse.error = error.message;
    errorResponse.stack = error.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  });
  
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create custom error
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error types
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
    this.name = 'TooManyRequestsError';
  }
}