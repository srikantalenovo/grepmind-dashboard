import jwt from 'jsonwebtoken';
import logger from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate access token
export function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: 'access'
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'grepmind',
      audience: 'grepmind-users'
    }
  );
}

// Generate refresh token
export function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'grepmind',
      audience: 'grepmind-users'
    }
  );
}

// Verify access token
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'grepmind',
      audience: 'grepmind-users'
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.error('Access token verification failed:', error.message);
    throw error;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'grepmind',
      audience: 'grepmind-users'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.error('Refresh token verification failed:', error.message);
    throw error;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

// Get token expiration time
export function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    logger.error('Failed to decode token for expiration:', error.message);
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token) {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
}

// Decode token without verification (for debugging)
export function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    logger.error('Failed to decode token:', error.message);
    return null;
  }
}