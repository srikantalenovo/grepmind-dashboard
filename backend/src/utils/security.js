import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from './logger.js';

const SALT_ROUNDS = 12;

// Hash password
export async function hashPassword(password) {
  try {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    
    return hash;
  } catch (error) {
    logger.error('Password hashing failed:', error.message);
    throw error;
  }
}

// Verify password
export async function verifyPassword(password, hash) {
  try {
    if (!password || !hash) {
      return false;
    }
    
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password verification failed:', error.message);
    return false;
  }
}

// Generate secure random token
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate random string
export function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Password strength validator
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^\w\s]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

// Calculate password strength score (0-100)
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 4, 25);
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[^\w\s]/.test(password)) score += 10;
  
  // Pattern penalties
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
  if (/^\d+$/.test(password)) score -= 10; // Only numbers
  if (/(..).*\1/.test(password)) score -= 10; // Repeated patterns
  
  // Sequential characters penalty
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    score -= 10;
  }
  
  if (/123|234|345|456|567|678|789|890/.test(password)) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Username validation
export function validateUsername(username) {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 30) {
    errors.push('Username must be less than 30 characters long');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  if (/^[0-9]/.test(username)) {
    errors.push('Username cannot start with a number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sanitize user input
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>"']/g, '') // Remove potentially dangerous characters
    .slice(0, 1000); // Limit length
}

// Generate CSRF token
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('base64');
}

// Verify CSRF token
export function verifyCSRFToken(token, sessionToken) {
  if (!token || !sessionToken) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64'),
      Buffer.from(sessionToken, 'base64')
    );
  } catch (error) {
    logger.error('CSRF token verification failed:', error.message);
    return false;
  }
}