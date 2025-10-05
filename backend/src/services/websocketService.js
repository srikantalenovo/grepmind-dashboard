import { WebSocketServer } from 'ws';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { logger } from '../utils/logger.js';

let wss = null;
let watchStreams = new Map(); // Track active watch streams
let monitoringInterval = null; // Track monitoring data interval

// Helper function to get cluster metrics (same as monitoring route)
async function getClusterMetrics() {
  try {
    const { coreApi, appsApi } = getKubernetesClient();
    
    // Get basic cluster metrics
    const [nodesRes, podsRes, deploymentsRes, servicesRes] = await Promise.allSettled([
      coreApi.listNode(),
      coreApi.listPodForAllNamespaces(),
      appsApi.listDeploymentForAllNamespaces(),
      coreApi.listServiceForAllNamespaces()
    ]);

    const metrics = {
      cluster: {
        nodes: {
          total: 0,
          ready: 0,
          notReady: 0
        },
        pods: {
          total: 0,
          running: 0,
          pending: 0,
          failed: 0,
          succeeded: 0
        },
        deployments: {
          total: 0,
          ready: 0,
          updating: 0
        },
        services: {
          total: 0,
          clusterIP: 0,
          nodePort: 0,
          loadBalancer: 0
        }
      },
      resourceUsage: {
        cpu: { used: 0, total: 1000, percentage: 0 },
        memory: { used: 0, total: 1000, percentage: 0 },
        storage: { used: 0, total: 1000, percentage: 0 }
      }
    };

    // Process nodes
    if (nodesRes.status === 'fulfilled') {
      const nodes = nodesRes.value.body.items;
      metrics.cluster.nodes.total = nodes.length;
      
      nodes.forEach(node => {
        const readyCondition = node.status.conditions?.find(c => c.type === 'Ready');
        if (readyCondition?.status === 'True') {
          metrics.cluster.nodes.ready++;
        } else {
          metrics.cluster.nodes.notReady++;
        }
      });
    }

    // Process pods
    if (podsRes.status === 'fulfilled') {
      const pods = podsRes.value.body.items;
      metrics.cluster.pods.total = pods.length;
      
      pods.forEach(pod => {
        switch (pod.status.phase) {
          case 'Running': metrics.cluster.pods.running++; break;
          case 'Pending': metrics.cluster.pods.pending++; break;
          case 'Failed': metrics.cluster.pods.failed++; break;
          case 'Succeeded': metrics.cluster.pods.succeeded++; break;
        }
      });
    }

    // Process deployments
    if (deploymentsRes.status === 'fulfilled') {
      const deployments = deploymentsRes.value.body.items;
      metrics.cluster.deployments.total = deployments.length;
      
      deployments.forEach(deployment => {
        const ready = deployment.status.readyReplicas || 0;
        const desired = deployment.spec.replicas || 0;
        
        if (ready === desired && desired > 0) {
          metrics.cluster.deployments.ready++;
        } else if (deployment.status.updatedReplicas !== deployment.spec.replicas) {
          metrics.cluster.deployments.updating++;
        }
      });
    }

    // Process services
    if (servicesRes.status === 'fulfilled') {
      const services = servicesRes.value.body.items;
      metrics.cluster.services.total = services.length;
      
      services.forEach(service => {
        switch (service.spec.type) {
          case 'ClusterIP': metrics.cluster.services.clusterIP++; break;
          case 'NodePort': metrics.cluster.services.nodePort++; break;
          case 'LoadBalancer': metrics.cluster.services.loadBalancer++; break;
        }
      });
    }

    // Calculate resource usage percentages
    metrics.resourceUsage.cpu.percentage = Math.round((metrics.resourceUsage.cpu.used / metrics.resourceUsage.cpu.total) * 100);
    metrics.resourceUsage.memory.percentage = Math.round((metrics.resourceUsage.memory.used / metrics.resourceUsage.memory.total) * 100);
    metrics.resourceUsage.storage.percentage = Math.round((metrics.resourceUsage.storage.used / metrics.resourceUsage.storage.total) * 100);

    return metrics;
  } catch (error) {
    logger.error('Error fetching cluster metrics for WebSocket:', error);
    return null;
  }
}

// Broadcast monitoring data to all connected clients
const broadcastMonitoringData = async () => {
  if (!wss || wss.clients.size === 0) return;
  
  const metrics = await getClusterMetrics();
  if (!metrics) return;
  
  const message = JSON.stringify({
    type: 'metrics',
    payload: metrics,
    timestamp: new Date().toISOString()
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

export const initializeWebSocket = (server) => {
  wss = new WebSocketServer({ 
    server,
    path: '/ws/monitoring'
  });
  
  wss.on('connection', (ws, req) => {
    logger.info('WebSocket client connected for monitoring');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await handleWebSocketMessage(ws, data);
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      // Clean up any active watches for this client
      cleanupClientWatches(ws);
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established'
    }));
    
    // Send initial monitoring data
    broadcastMonitoringData();
  });
  
  // Start monitoring data broadcast every 30 seconds
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  monitoringInterval = setInterval(() => {
    broadcastMonitoringData();
  }, 30000); // 30 seconds
  
  logger.info('WebSocket server initialized with monitoring data broadcasting');
};

const handleWebSocketMessage = async (ws, data) => {
  const { type, namespace, resourceType, options = {} } = data;
  
  switch (type) {
    case 'watch':
      await startWatching(ws, namespace, resourceType, options);
      break;
      
    case 'unwatch':
      await stopWatching(ws, namespace, resourceType);
      break;
      
    case 'monitoring':
      // Send current monitoring data immediately
      await broadcastMonitoringData();
      break;
      
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`
      }));
  }
};

const startWatching = async (ws, namespace, resourceType, options) => {
  try {
    const watchKey = `${namespace}-${resourceType}`;
    
    // Stop existing watch if any
    if (watchStreams.has(watchKey)) {
      stopWatching(ws, namespace, resourceType);
    }
    
    const { coreApi, appsApi } = getKubernetesClient();
    let watchRequest;
    
    // Set up watch based on resource type
    switch (resourceType) {
      case 'pods':
        watchRequest = await coreApi.listNamespacedPod(
          namespace,
          undefined, // pretty
          undefined, // allowWatchBookmarks
          undefined, // continue
          undefined, // fieldSelector
          options.labelSelector,
          undefined, // limit
          undefined, // resourceVersion
          undefined, // resourceVersionMatch
          30, // timeoutSeconds
          true // watch
        );
        break;
        
      case 'deployments':
        watchRequest = await appsApi.listNamespacedDeployment(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          30,
          true
        );
        break;
        
      case 'services':
        watchRequest = await coreApi.listNamespacedService(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          30,
          true
        );
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Watching not supported for resource type: ${resourceType}`
        }));
        return;
    }
    
    // Store the watch stream
    watchStreams.set(watchKey, {
      ws,
      stream: watchRequest,
      namespace,
      resourceType
    });
    
    // Handle watch events
    watchRequest.on('data', (event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'watch-event',
          namespace,
          resourceType,
          event: {
            type: event.type,
            object: event.object
          }
        }));
      }
    });
    
    watchRequest.on('error', (error) => {
      logger.error(`Watch error for ${watchKey}:`, error);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'watch-error',
          namespace,
          resourceType,
          error: error.message
        }));
      }
      watchStreams.delete(watchKey);
    });
    
    watchRequest.on('end', () => {
      logger.info(`Watch ended for ${watchKey}`);
      watchStreams.delete(watchKey);
    });
    
    ws.send(JSON.stringify({
      type: 'watch-started',
      namespace,
      resourceType,
      message: `Started watching ${resourceType} in namespace ${namespace}`
    }));
    
  } catch (error) {
    const k8sError = handleK8sError(error, `Start watching ${resourceType}`);
    ws.send(JSON.stringify({
      type: 'watch-error',
      namespace,
      resourceType,
      error: k8sError.message
    }));
  }
};

const stopWatching = async (ws, namespace, resourceType) => {
  const watchKey = `${namespace}-${resourceType}`;
  
  if (watchStreams.has(watchKey)) {
    const { stream } = watchStreams.get(watchKey);
    
    try {
      stream.abort();
    } catch (error) {
      logger.error(`Error stopping watch for ${watchKey}:`, error);
    }
    
    watchStreams.delete(watchKey);
    
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'watch-stopped',
        namespace,
        resourceType,
        message: `Stopped watching ${resourceType} in namespace ${namespace}`
      }));
    }
  }
};

const cleanupClientWatches = (ws) => {
  const toDelete = [];
  
  for (const [watchKey, watchData] of watchStreams.entries()) {
    if (watchData.ws === ws) {
      toDelete.push(watchKey);
      try {
        watchData.stream.abort();
      } catch (error) {
        logger.error(`Error cleaning up watch for ${watchKey}:`, error);
      }
    }
  }
  
  toDelete.forEach(key => watchStreams.delete(key));
  logger.info(`Cleaned up ${toDelete.length} watches for disconnected client`);
};

// Broadcast message to all connected clients
export const broadcastToClients = (message) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
};

// Get connected clients count
export const getConnectedClientsCount = () => {
  return wss ? wss.clients.size : 0;
};

// Cleanup all watches (for server shutdown)
export const cleanupAllWatches = () => {
  watchStreams.forEach(({ stream }, watchKey) => {
    try {
      stream.abort();
    } catch (error) {
      logger.error(`Error cleaning up watch for ${watchKey}:`, error);
    }
  });
  
  watchStreams.clear();
  
  // Clear monitoring interval
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  logger.info('All WebSocket watches and monitoring interval cleaned up');
};
