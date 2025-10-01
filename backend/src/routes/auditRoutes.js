import express from 'express';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { requestId, responseTime } from '../middleware/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';

const router = express.Router();

// Add middleware
router.use(requestId);
router.use(responseTime);
router.use(authenticateToken);
router.use(adminOnly); // Only admins can access audit logs

// Get audit logs
router.get('/', asyncHandler(async (req, res) => {
  const { action, resource, userId, limit = 100, offset = 0 } = req.query;
  
  const where = {};
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (userId) where.userId = userId;
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    }),
    prisma.auditLog.count({ where })
  ]);
  
  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total
    }
  });
}));

export default router;