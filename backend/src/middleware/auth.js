import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { RedisService } from '../config/redis.js';

// Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await RedisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        error: 'User account is disabled',
        code: 'USER_DISABLED'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Update last activity in cache
    await RedisService.set(`user:${user.id}:lastActivity`, new Date().toISOString(), 3600);
    
    next();
  } catch (error) {
    logger.error('Authentication failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (roles.length === 0 || roles.includes(req.user.role)) {
      return next();
    }
    
    logger.logSecurityEvent('Unauthorized access attempt', req.user.id, {
      requiredRoles: roles,
      userRole: req.user.role,
      endpoint: req.originalUrl
    });
    
    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: roles,
      current: req.user.role
    });
  };
};

// Admin only middleware
export const adminOnly = authorize('admin');

// Editor and above middleware
export const editorOrAbove = authorize('admin', 'editor');

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next();
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await RedisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }
    
    const decoded = verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });
    
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Silently continue without user context
    next();
  }
};

// Rate limiting per user
export const userRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const key = `rate_limit:user:${req.user.id}`;
    const current = await RedisService.incr(key, Math.ceil(windowMs / 1000));
    
    if (current > maxRequests) {
      logger.logSecurityEvent('Rate limit exceeded', req.user.id, {
        endpoint: req.originalUrl,
        requests: current,
        limit: maxRequests
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - current),
      'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
    });
    
    next();
  };
};

// API key authentication (for service-to-service)
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key is required',
        code: 'API_KEY_REQUIRED'
      });
    }
    
    // Check API key in database or cache
    const keyData = await RedisService.get(`api_key:${apiKey}`);
    
    if (!keyData) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
    }
    
    const { userId, permissions } = JSON.parse(keyData);
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'API key associated user is invalid',
        code: 'API_KEY_USER_INVALID'
      });
    }
    
    req.user = user;
    req.apiKey = apiKey;
    req.permissions = permissions;
    
    next();
  } catch (error) {
    logger.error('API key authentication failed:', error.message);
    return res.status(500).json({
      error: 'API key authentication error',
      code: 'API_KEY_AUTH_ERROR'
    });
  }
};