import { body, validationResult } from 'express-validator';
import prisma from '../config/database.js';
import { RedisService } from '../config/redis.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword, validatePasswordStrength, validateEmail, validateUsername } from '../utils/security.js';
import logger from '../utils/logger.js';
import { asyncHandler, ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

// Validation rules
export const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters long'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Controllers
export const signup = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { email, username, password, firstName, lastName } = req.body;
  
  // Additional password validation
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password does not meet requirements', passwordValidation.errors);
  }
  
  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });
  
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    throw new ConflictError(`User with this ${field} already exists`);
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'viewer' // Default role
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true
    }
  });
  
  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email
  });
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });
  
  // Log successful signup
  logger.info('User signed up successfully', {
    userId: user.id,
    email: user.email,
    username: user.username
  });
  
  res.status(201).json({
    message: 'User created successfully',
    user,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { email, password } = req.body;
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      passwordHash: true,
      isActive: true,
      lastLoginAt: true
    }
  });
  
  if (!user) {
    // Log failed login attempt
    logger.logSecurityEvent('Failed login attempt - user not found', null, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw new UnauthorizedError('Invalid email or password');
  }
  
  if (!user.isActive) {
    logger.logSecurityEvent('Failed login attempt - user disabled', user.id, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw new UnauthorizedError('Account is disabled');
  }
  
  // Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    logger.logSecurityEvent('Failed login attempt - invalid password', user.id, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw new UnauthorizedError('Invalid email or password');
  }
  
  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email
  });
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });
  
  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  
  // Remove password hash from response
  const { passwordHash, ...userData } = user;
  
  // Log successful login
  logger.info('User logged in successfully', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    message: 'Login successful',
    user: userData,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    }
  });
});

export const refreshTokens = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { refreshToken } = req.body;
  
  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
  
  // Check if refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      }
    }
  });
  
  if (!storedToken) {
    throw new UnauthorizedError('Refresh token not found');
  }
  
  if (storedToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });
    
    throw new UnauthorizedError('Refresh token has expired');
  }
  
  if (!storedToken.user.isActive) {
    throw new UnauthorizedError('User account is disabled');
  }
  
  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role
  });
  
  const newRefreshToken = generateRefreshToken({
    userId: storedToken.user.id,
    email: storedToken.user.email
  });
  
  // Update refresh token in database
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });
  
  logger.info('Tokens refreshed successfully', {
    userId: storedToken.user.id,
    email: storedToken.user.email
  });
  
  res.json({
    message: 'Tokens refreshed successfully',
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const accessToken = req.token;
  
  // Blacklist the access token
  if (accessToken) {
    const expirationTime = 15 * 60; // 15 minutes in seconds
    await RedisService.set(`blacklist:${accessToken}`, 'true', expirationTime);
  }
  
  // Remove refresh token from database if provided
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId: req.user?.id
      }
    });
  }
  
  logger.info('User logged out successfully', {
    userId: req.user?.id,
    email: req.user?.email
  });
  
  res.json({
    message: 'Logout successful'
  });
});

export const logoutAll = asyncHandler(async (req, res) => {
  const accessToken = req.token;
  const userId = req.user.id;
  
  // Blacklist the current access token
  if (accessToken) {
    const expirationTime = 15 * 60; // 15 minutes in seconds
    await RedisService.set(`blacklist:${accessToken}`, 'true', expirationTime);
  }
  
  // Remove all refresh tokens for the user
  await prisma.refreshToken.deleteMany({
    where: { userId }
  });
  
  logger.info('User logged out from all devices', {
    userId,
    email: req.user.email
  });
  
  res.json({
    message: 'Logged out from all devices successfully'
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  res.json({
    user
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }
  
  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new ValidationError('New password does not meet requirements', passwordValidation.errors);
  }
  
  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      passwordHash: true
    }
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  
  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);
  
  // Update password in database
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash }
  });
  
  // Log password change
  logger.logSecurityEvent('Password changed', user.id, {
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    message: 'Password changed successfully'
  });
});