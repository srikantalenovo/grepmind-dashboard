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

// Get metrics (placeholder - would integrate with Prometheus)
router.get('/cluster', asyncHandler(async (req, res) => {
  const { timeRange = '1h' } = req.query;
  
  // This would typically query Prometheus
  const metrics = {
    cpu: {
      current: 45.2,
      average: 42.1,
      max: 78.5,
      unit: '%'
    },
    memory: {
      current: 62.8,
      average: 58.3,
      max: 85.2,
      unit: '%'
    },
    network: {
      inbound: 125.4,
      outbound: 89.7,
      unit: 'MB/s'
    },
    storage: {
      used: 324.7,
      total: 500.0,
      unit: 'GB'
    },
    timeRange,
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: metrics
  });
}));

export default router;