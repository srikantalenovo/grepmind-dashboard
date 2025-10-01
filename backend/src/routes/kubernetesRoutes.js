import express from 'express';
import {
  getClusterInfo,
  getNamespaces,
  getPods,
  getDeployments,
  getServices,
  getNodes,
  getEvents,
  scaleDeployment,
  getResourceUsage,
  healthCheck
} from '../controllers/kubernetesController.js';
import { authenticateToken, authorize, editorOrAbove } from '../middleware/auth.js';
import { requestId, responseTime } from '../middleware/logger.js';

const router = express.Router();

// Add middleware
router.use(requestId);
router.use(responseTime);
router.use(authenticateToken);

// Health check (public to authenticated users)
router.get('/health', healthCheck);

// Cluster information
router.get('/cluster', getClusterInfo);

// Namespace routes
router.get('/namespaces', getNamespaces);

// Pod routes
router.get('/pods', getPods);
router.get('/namespaces/:namespace/pods', getPods);

// Deployment routes
router.get('/deployments', getDeployments);
router.get('/namespaces/:namespace/deployments', getDeployments);
router.post('/namespaces/:namespace/deployments/:deploymentName/scale', editorOrAbove, scaleDeployment);

// Service routes
router.get('/services', getServices);
router.get('/namespaces/:namespace/services', getServices);

// Node routes
router.get('/nodes', getNodes);

// Event routes
router.get('/events', getEvents);
router.get('/namespaces/:namespace/events', getEvents);

// Resource usage routes
router.get('/usage', getResourceUsage);
router.get('/namespaces/:namespace/usage', getResourceUsage);

export default router;