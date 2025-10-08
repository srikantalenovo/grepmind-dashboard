import { WebSocketServer } from 'ws';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { logger } from '../utils/logger.js';

// Helper functions from monitoring routes (moved to global scope)
const safePercentage = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  const result = (numerator / denominator) * 100;
  return !isFinite(result) || isNaN(result) ? 0 : result;
};

const safeValue = (value, defaultValue = 0) => {
  return (typeof value === 'number' && !isNaN(value) && isFinite(value)) ? value : defaultValue;
};

const safeRound = (value, decimals = 2) => {
  const validValue = safeValue(value);
  return Math.round(validValue * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

let wss = null;
let watchStreams = new Map(); // Track active watch streams
let monitoringInterval = null; // Track monitoring data interval

// Real cluster resource usage calculation (copied from monitoring routes)
async function getClusterResourceUsage() {
  try {
    const { coreApi } = getKubernetesClient();
    
    // Get nodes and pods data
    const [nodesRes, podsRes] = await Promise.allSettled([
      coreApi.listNode(),
      coreApi.listPodForAllNamespaces()
    ]);

    let totalCpuCapacity = 0;
    let totalMemoryCapacity = 0; // in Ki
    let totalStorageCapacity = 100 * 1024 * 1024; // Default 100Gi in Ki
    let cpuUsage = 0;
    let memoryUsage = 0; // in Ki
    let storageUsage = 0;

    // Calculate total cluster capacity from nodes
    if (nodesRes.status === 'fulfilled') {
      const nodes = nodesRes.value.body.items;
      
      nodes.forEach(node => {
        const allocatable = node.status.allocatable || {};
        
        // CPU capacity (e.g., "2" cores)
        const cpu = allocatable.cpu || '0';
        totalCpuCapacity += parseFloat(cpu) || 0;
        
        // Memory capacity (e.g., "4Gi", "1024Mi", "1048576Ki")
        const memory = allocatable.memory || '0Ki';
        if (memory.includes('Gi')) {
          totalMemoryCapacity += parseFloat(memory.replace('Gi', '')) * 1024 * 1024; // Convert Gi to Ki
        } else if (memory.includes('Mi')) {
          totalMemoryCapacity += parseFloat(memory.replace('Mi', '')) * 1024; // Convert Mi to Ki
        } else if (memory.includes('Ki')) {
          totalMemoryCapacity += parseFloat(memory.replace('Ki', ''));
        }
        
        // Storage capacity (simplified - using ephemeral-storage or default)
        const storage = allocatable['ephemeral-storage'] || '100Gi';
        if (storage.includes('Gi')) {
          totalStorageCapacity += parseFloat(storage.replace('Gi', '')) * 1024 * 1024; // Convert to Ki
        }
      });
    }

    // Calculate actual usage from pods
    if (podsRes.status === 'fulfilled') {
      const pods = podsRes.value.body.items;
      
      pods.forEach(pod => {
        if (pod.status.phase === 'Running' && pod.spec.containers) {
          pod.spec.containers.forEach(container => {
            if (container.resources?.requests) {
              // Sum up CPU requests (e.g., "100m", "0.5")
              const cpuRequest = container.resources.requests.cpu || '0';
              if (cpuRequest.includes('m')) {
                cpuUsage += parseFloat(cpuRequest.replace('m', '')) / 1000; // Convert milliCPU to CPU
              } else {
                cpuUsage += parseFloat(cpuRequest) || 0;
              }
              
              // Sum up memory requests (e.g., "128Mi")
              const memoryRequest = container.resources.requests.memory || '0';
              if (memoryRequest.includes('Mi')) {
                memoryUsage += parseFloat(memoryRequest.replace('Mi', '')) * 1024; // Convert Mi to Ki
              } else if (memoryRequest.includes('Gi')) {
                memoryUsage += parseFloat(memoryRequest.replace('Gi', '')) * 1024 * 1024; // Convert Gi to Ki
              }
            }
          });
        }
      });
      
      // Estimate storage usage as a percentage of pod count vs capacity
      storageUsage = (pods.length / Math.max(totalCpuCapacity * 10, 1)) * totalStorageCapacity * 0.3;
    }
    
    // Calculate percentages using global helper functions
    const cpuPercentage = safePercentage(cpuUsage, totalCpuCapacity);
    const memoryPercentage = safePercentage(memoryUsage, totalMemoryCapacity);
    const storagePercentage = safePercentage(storageUsage, totalStorageCapacity);

    return {
      cpu: {
        used: safeRound(safeValue(cpuUsage), 2),
        total: safeRound(safeValue(totalCpuCapacity), 2),
        percentage: safeRound(safeValue(cpuPercentage), 2)
      },
      memory: {
        used: Math.round(safeValue(memoryUsage / 1024)), // Convert Ki to Mi
        total: Math.round(safeValue(totalMemoryCapacity / 1024)), // Convert Ki to Mi
        percentage: safeRound(safeValue(memoryPercentage), 2)
      },
      storage: {
        used: Math.round(safeValue(storageUsage / (1024 * 1024))), // Convert Ki to Gi
        total: Math.round(safeValue(totalStorageCapacity / (1024 * 1024))), // Convert Ki to Gi
        percentage: safeRound(safeValue(storagePercentage), 2)
      }
    };
    
  } catch (error) {
    logger.error('Error getting cluster resource usage for WebSocket:', error);
    // Return reasonable defaults if unable to get real data
    return {
      cpu: {
        used: 0,
        total: 4,
        percentage: 0
      },
      memory: {
        used: 0,
        total: 8192, // 8Gi in Mi
        percentage: 0
      },
      storage: {
        used: 0,
        total: 100, // 100Gi
        percentage: 0
      }
    };
  }
}

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
      resourceUsage: await getClusterResourceUsage()
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
  
  // 🔍 Debug: Log WebSocket metrics being sent
  logger.info('🔍 WebSocket broadcasting metrics:', {
    cpuPercentage: metrics.resourceUsage.cpu.percentage,
    memoryPercentage: metrics.resourceUsage.memory.percentage,
    cpuUsed: metrics.resourceUsage.cpu.used,
    cpuTotal: metrics.resourceUsage.cpu.total,
    memoryUsed: metrics.resourceUsage.memory.used,
    memoryTotal: metrics.resourceUsage.memory.total
  });
  
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

