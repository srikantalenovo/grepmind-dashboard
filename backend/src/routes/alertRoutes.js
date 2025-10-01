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

// Get alerts
router.get('/', asyncHandler(async (req, res) => {
  const { status, severity } = req.query;
  
  const where = {};
  if (status) where.status = status;
  
  const alerts = await prisma.alert.findMany({
    where,
    include: {
      rule: {
        select: {
          id: true,
          name: true,
          description: true,
          severity: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });
  
  // Filter by severity if provided
  const filteredAlerts = severity 
    ? alerts.filter(alert => alert.rule.severity === severity)
    : alerts;
  
  res.json({
    success: true,
    data: filteredAlerts,
    count: filteredAlerts.length
  });
}));

export default router;