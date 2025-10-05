import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }
    
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        NOT: { id: req.user.id }
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already taken'
      });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        email: email.toLowerCase()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'PROFILE_UPDATE',
        details: { updatedFields: ['name', 'email'] },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true, data: updatedUser });
    logger.info(`User profile updated: ${updatedUser.email}`);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    
    // Revoke all refresh tokens (force re-login on all devices)
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'PASSWORD_CHANGE',
        details: { forced_relogin: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
    
    logger.info(`Password changed for user: ${user.email}`);
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Get user activity logs
router.get('/activity', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const activities = await prisma.activityLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      select: {
        id: true,
        action: true,
        details: true,
        ipAddress: true,
        createdAt: true
      }
    });
    
    const total = await prisma.activityLog.count({
      where: { userId: req.user.id }
    });
    
    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activity logs' });
  }
});

// Admin routes

// Get all users (admin only)
router.get('/all', authorize(['admin']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Create user (admin only)
router.post('/create', authorize(['admin']), async (req, res) => {
  try {
    const { email, password, name, role = 'viewer' } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }
    
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin, editor, or viewer'
      });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATE',
        details: { createdUserId: newUser.id, role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.status(201).json({ success: true, data: newUser });
    logger.info(`User created by admin: ${newUser.email}`);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user role (admin only)
router.put('/:userId/role', authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin, editor, or viewer'
      });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_ROLE_UPDATE',
        details: { targetUserId: userId, newRole: role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true, data: updatedUser });
    logger.info(`User role updated: ${updatedUser.email} -> ${role}`);
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

// Toggle user status (activate/deactivate) (admin only)
router.put('/:userId/status', authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify your own status'
      });
    }
    
    // Get current user status
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true }
    });
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Toggle status
    const newStatus = !currentUser.isActive;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });
    
    // If deactivating user, revoke all their refresh tokens
    if (!newStatus) {
      await prisma.refreshToken.deleteMany({
        where: { userId }
      });
    }
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: newStatus ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
        details: { 
          targetUserId: userId, 
          previousStatus: currentUser.isActive,
          newStatus 
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true, data: updatedUser });
    logger.info(`User status toggled: ${updatedUser.email} -> ${newStatus ? 'active' : 'inactive'}`);
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle user status' });
  }
});

// Delete user (admin only)
router.delete('/:userId', authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    // Get user details before deletion for logging
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    });
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Start transaction to delete user and related data
    await prisma.$transaction(async (tx) => {
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId }
      });
      
      // Delete activity logs
      await tx.activityLog.deleteMany({
        where: { userId }
      });
      
      // Delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });
    
    // Log activity (create log entry after user deletion)
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_DELETE',
        details: { 
          deletedUserId: userId,
          deletedUserEmail: userToDelete.email,
          deletedUserName: userToDelete.name,
          deletedUserRole: userToDelete.role
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ 
      success: true, 
      message: `User ${userToDelete.email} has been deleted successfully` 
    });
    logger.info(`User deleted by admin: ${userToDelete.email}`);
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
