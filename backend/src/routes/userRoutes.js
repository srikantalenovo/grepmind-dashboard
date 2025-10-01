import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requestId, responseTime } from '../middleware/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';

const router = express.Router();

// Add middleware
router.use(requestId);
router.use(responseTime);
router.use(authenticateToken);

// Get user profile
router.get('/profile', asyncHandler(async (req, res) => {
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
  
  res.json({ user });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;
  
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      firstName: firstName || null,
      lastName: lastName || null
    },
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
  
  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

export default router;