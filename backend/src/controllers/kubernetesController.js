import { KubernetesService } from '../config/kubernetes.js';
import { CacheManager } from '../config/redis.js';
import logger from '../utils/logger.js';
import { asyncHandler, NotFoundError, AppError } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';

// Cache TTL in seconds
const CACHE_TTL = 30; // 30 seconds for real-time data
const METRICS_CACHE_TTL = 60; // 1 minute for metrics

export const getClusterInfo = asyncHandler(async (req, res) => {
  const cacheKey = 'cluster:info';
  
  // Try to get from cache first
  let clusterInfo = await CacheManager.getCachedData(cacheKey);
  
  if (!clusterInfo) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      clusterInfo = await KubernetesService.getClusterInfo();
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, clusterInfo, CACHE_TTL);
      
      logger.logKubernetesOperation('getClusterInfo', 'cluster', null, true);
    } catch (error) {
      logger.logKubernetesOperation('getClusterInfo', 'cluster', null, false, error);
      throw new AppError(`Failed to get cluster info: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: clusterInfo,
    cached: !!clusterInfo,
    timestamp: new Date().toISOString()
  });
});

export const getNamespaces = asyncHandler(async (req, res) => {
  const cacheKey = 'namespaces:all';
  
  // Try to get from cache first
  let namespaces = await CacheManager.getCachedData(cacheKey);
  
  if (!namespaces) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      namespaces = await KubernetesService.getNamespaces();
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, namespaces, CACHE_TTL);
      
      logger.logKubernetesOperation('getNamespaces', 'namespaces', null, true);
    } catch (error) {
      logger.logKubernetesOperation('getNamespaces', 'namespaces', null, false, error);
      throw new AppError(`Failed to get namespaces: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: namespaces,
    count: namespaces.length,
    timestamp: new Date().toISOString()
  });
});

export const getPods = asyncHandler(async (req, res) => {
  const { namespace } = req.params;
  const { status, node, label } = req.query;
  
  const cacheKey = `pods:${namespace || 'all'}:${JSON.stringify(req.query)}`;
  
  // Try to get from cache first
  let pods = await CacheManager.getCachedData(cacheKey);
  
  if (!pods) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      pods = await KubernetesService.getPods(namespace);
      
      // Apply filters
      if (status) {
        pods = pods.filter(pod => pod.status.toLowerCase() === status.toLowerCase());
      }
      
      if (node) {
        pods = pods.filter(pod => pod.node === node);
      }
      
      if (label) {
        const [key, value] = label.split('=');
        pods = pods.filter(pod => pod.labels[key] === value);
      }
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, pods, CACHE_TTL);
      
      logger.logKubernetesOperation('getPods', 'pods', namespace, true);
    } catch (error) {
      logger.logKubernetesOperation('getPods', 'pods', namespace, false, error);
      throw new AppError(`Failed to get pods: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: pods,
    count: pods.length,
    namespace: namespace || 'all',
    filters: { status, node, label },
    timestamp: new Date().toISOString()
  });
});

export const getDeployments = asyncHandler(async (req, res) => {
  const { namespace } = req.params;
  const cacheKey = `deployments:${namespace || 'all'}`;
  
  // Try to get from cache first
  let deployments = await CacheManager.getCachedData(cacheKey);
  
  if (!deployments) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      deployments = await KubernetesService.getDeployments(namespace);
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, deployments, CACHE_TTL);
      
      logger.logKubernetesOperation('getDeployments', 'deployments', namespace, true);
    } catch (error) {
      logger.logKubernetesOperation('getDeployments', 'deployments', namespace, false, error);
      throw new AppError(`Failed to get deployments: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: deployments,
    count: deployments.length,
    namespace: namespace || 'all',
    timestamp: new Date().toISOString()
  });
});

export const getServices = asyncHandler(async (req, res) => {
  const { namespace } = req.params;
  const cacheKey = `services:${namespace || 'all'}`;
  
  // Try to get from cache first
  let services = await CacheManager.getCachedData(cacheKey);
  
  if (!services) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      services = await KubernetesService.getServices(namespace);
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, services, CACHE_TTL);
      
      logger.logKubernetesOperation('getServices', 'services', namespace, true);
    } catch (error) {
      logger.logKubernetesOperation('getServices', 'services', namespace, false, error);
      throw new AppError(`Failed to get services: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: services,
    count: services.length,
    namespace: namespace || 'all',
    timestamp: new Date().toISOString()
  });
});

export const getNodes = asyncHandler(async (req, res) => {
  const cacheKey = 'nodes:all';
  
  // Try to get from cache first
  let nodes = await CacheManager.getCachedData(cacheKey);
  
  if (!nodes) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      nodes = await KubernetesService.getNodes();
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, nodes, CACHE_TTL);
      
      logger.logKubernetesOperation('getNodes', 'nodes', null, true);
    } catch (error) {
      logger.logKubernetesOperation('getNodes', 'nodes', null, false, error);
      throw new AppError(`Failed to get nodes: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: nodes,
    count: nodes.length,
    timestamp: new Date().toISOString()
  });
});

export const getEvents = asyncHandler(async (req, res) => {
  const { namespace } = req.params;
  const { limit = 100, type } = req.query;
  
  const cacheKey = `events:${namespace || 'all'}:${limit}:${type || 'all'}`;
  
  // Try to get from cache first
  let events = await CacheManager.getCachedData(cacheKey);
  
  if (!events) {
    try {
      if (!KubernetesService.isAvailable()) {
        throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
      }
      
      events = await KubernetesService.getEvents(namespace, parseInt(limit));
      
      // Filter by type if specified
      if (type) {
        events = events.filter(event => event.type.toLowerCase() === type.toLowerCase());
      }
      
      // Sort by last timestamp (most recent first)
      events.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, events, CACHE_TTL);
      
      logger.logKubernetesOperation('getEvents', 'events', namespace, true);
    } catch (error) {
      logger.logKubernetesOperation('getEvents', 'events', namespace, false, error);
      throw new AppError(`Failed to get events: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: events,
    count: events.length,
    namespace: namespace || 'all',
    filters: { limit, type },
    timestamp: new Date().toISOString()
  });
});

export const scaleDeployment = asyncHandler(async (req, res) => {
  const { namespace, deploymentName } = req.params;
  const { replicas } = req.body;
  
  if (!replicas || isNaN(parseInt(replicas))) {
    throw new AppError('Valid replica count is required', 400, 'INVALID_REPLICAS');
  }
  
  // Check user permissions
  if (req.user.role === 'viewer') {
    throw new AppError('Insufficient permissions to scale deployments', 403, 'INSUFFICIENT_PERMISSIONS');
  }
  
  try {
    if (!KubernetesService.isAvailable()) {
      throw new AppError('Kubernetes cluster not available', 503, 'K8S_UNAVAILABLE');
    }
    
    const result = await KubernetesService.scaleDeployment(namespace, deploymentName, replicas);
    
    // Invalidate cache
    await CacheManager.invalidateCache(`deployments:${namespace}*`);
    await CacheManager.invalidateCache(`pods:${namespace}*`);
    await CacheManager.invalidateCache('cluster:info');
    
    // Log the scaling operation
    logger.info('Deployment scaled successfully', {
      userId: req.user.id,
      namespace,
      deploymentName,
      replicas: parseInt(replicas),
      result
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SCALE_DEPLOYMENT',
        resource: 'deployment',
        resourceId: `${namespace}/${deploymentName}`,
        details: {
          namespace,
          deploymentName,
          replicas: parseInt(replicas),
          previousReplicas: result.previousReplicas
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    logger.logKubernetesOperation('scaleDeployment', `${namespace}/${deploymentName}`, namespace, true);
    
    res.json({
      success: true,
      message: 'Deployment scaled successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logKubernetesOperation('scaleDeployment', `${namespace}/${deploymentName}`, namespace, false, error);
    throw new AppError(`Failed to scale deployment: ${error.message}`, 500, 'K8S_ERROR');
  }
});

export const getResourceUsage = asyncHandler(async (req, res) => {
  const { namespace } = req.params;
  const { timeRange = '1h' } = req.query;
  
  const cacheKey = `resource-usage:${namespace || 'all'}:${timeRange}`;
  
  // Try to get from cache first
  let usage = await CacheManager.getCachedData(cacheKey);
  
  if (!usage) {
    try {
      // Get current resource usage (this would typically come from Prometheus)
      const [pods, nodes] = await Promise.all([
        KubernetesService.getPods(namespace),
        KubernetesService.getNodes()
      ]);
      
      // Calculate resource usage summary
      usage = {
        totalPods: pods.length,
        runningPods: pods.filter(p => p.status === 'Running').length,
        pendingPods: pods.filter(p => p.status === 'Pending').length,
        failedPods: pods.filter(p => p.status === 'Failed').length,
        totalNodes: nodes.length,
        readyNodes: nodes.filter(n => n.status === 'Ready').length,
        cpuRequests: '0m', // Would be calculated from actual metrics
        memoryRequests: '0Mi', // Would be calculated from actual metrics
        cpuLimits: '0m', // Would be calculated from actual metrics
        memoryLimits: '0Mi', // Would be calculated from actual metrics
        namespace: namespace || 'all',
        timeRange
      };
      
      // Cache the result
      await CacheManager.cacheData(cacheKey, usage, METRICS_CACHE_TTL);
      
      logger.logKubernetesOperation('getResourceUsage', 'resource-usage', namespace, true);
    } catch (error) {
      logger.logKubernetesOperation('getResourceUsage', 'resource-usage', namespace, false, error);
      throw new AppError(`Failed to get resource usage: ${error.message}`, 500, 'K8S_ERROR');
    }
  }
  
  res.json({
    success: true,
    data: usage,
    timestamp: new Date().toISOString()
  });
});

// Health check for Kubernetes connectivity
export const healthCheck = asyncHandler(async (req, res) => {
  const isAvailable = KubernetesService.isAvailable();
  
  let clusterHealth = {
    kubernetes: {
      available: isAvailable,
      status: isAvailable ? 'connected' : 'disconnected'
    }
  };
  
  if (isAvailable) {
    try {
      const clusterInfo = await KubernetesService.getClusterInfo();
      clusterHealth.kubernetes = {
        ...clusterHealth.kubernetes,
        status: 'connected',
        ...clusterInfo
      };
    } catch (error) {
      clusterHealth.kubernetes = {
        available: false,
        status: 'error',
        error: error.message
      };
    }
  }
  
  res.json({
    success: true,
    data: clusterHealth,
    timestamp: new Date().toISOString()
  });
});