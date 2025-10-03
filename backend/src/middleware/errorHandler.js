import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Default error
  let error = {
    status: err.statusCode || 500,
    message: err.message || 'Internal Server Error',
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = Object.values(err.errors).map(val => val.message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error.status = 400;
    error.message = 'Duplicate field value';
    error.field = Object.keys(err.keyValue)[0];
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.status = 401;
    error.message = 'Token expired';
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        error.status = 400;
        error.message = 'Duplicate entry';
        break;
      case '23503': // foreign_key_violation
        error.status = 400;
        error.message = 'Referenced record not found';
        break;
      case '23502': // not_null_violation
        error.status = 400;
        error.message = 'Required field missing';
        break;
      case '22P02': // invalid_text_representation
        error.status = 400;
        error.message = 'Invalid data format';
        break;
      default:
        if (process.env.NODE_ENV === 'development') {
          error.details = err.detail;
        }
    }
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Something went wrong';
    delete error.details;
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};