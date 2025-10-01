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

// Get dashboards
router.get('/', asyncHandler(async (req, res) => {
  const dashboards = await prisma.metricsDashboard.findMany({
    where: {
      OR: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      panels: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
  
  res.json({
    success: true,
    data: dashboards,
    count: dashboards.length
  });
}));

// Create dashboard
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, isPublic = false, panels = [] } = req.body;
  
  const dashboard = await prisma.metricsDashboard.create({
    data: {
      name,
      description,
      isPublic,
      userId: req.user.id,
      panels: {
        create: panels.map(panel => ({
          title: panel.title,
          query: panel.query,
          chartType: panel.chartType,
          position: panel.position || {},
          thresholds: panel.thresholds || {},
          displayOptions: panel.displayOptions || {},
          refreshInterval: panel.refreshInterval || 30
        }))
      }
    },
    include: {
      panels: true
    }
  });
  
  res.status(201).json({
    success: true,
    message: 'Dashboard created successfully',
    data: dashboard
  });
}));

export default router;