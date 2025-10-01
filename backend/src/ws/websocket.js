import logger from '../utils/logger.js';
import { KubernetesService } from '../config/kubernetes.js';
import { CacheManager } from '../config/redis.js';

let connectedClients = new Map();
let updateInterval = null;

// WebSocket events
const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_NAMESPACE: 'join_namespace',
  LEAVE_NAMESPACE: 'leave_namespace',
  POD_UPDATE: 'pod_update',
  DEPLOYMENT_UPDATE: 'deployment_update',
  SERVICE_UPDATE: 'service_update',
  NODE_UPDATE: 'node_update',
  EVENT_UPDATE: 'event_update',
  CLUSTER_UPDATE: 'cluster_update',
  ERROR: 'error'
};

export function setupWebSocket(io) {
  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token required');
      }
      
      // Verify token (simplified - in production, use proper JWT verification)
      // This would normally verify the JWT token
      socket.userId = 'user-id'; // Extract from token
      socket.userRole = 'viewer'; // Extract from token
      
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });
  
  io.on(WS_EVENTS.CONNECTION, (socket) => {
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole
    });
    
    // Store client info
    connectedClients.set(socket.id, {
      socket,
      userId: socket.userId,
      userRole: socket.userRole,
      namespaces: new Set(),
      connectedAt: new Date()
    });
    
    // Join namespace room
    socket.on(WS_EVENTS.JOIN_NAMESPACE, (namespace) => {
      const client = connectedClients.get(socket.id);
      if (client) {
        client.namespaces.add(namespace);
        socket.join(`namespace:${namespace}`);
        
        logger.info('Client joined namespace', {
          socketId: socket.id,
          userId: client.userId,
          namespace
        });
        
        // Send initial data for the namespace
        sendNamespaceData(socket, namespace);
      }
    });
    
    // Leave namespace room
    socket.on(WS_EVENTS.LEAVE_NAMESPACE, (namespace) => {
      const client = connectedClients.get(socket.id);
      if (client) {
        client.namespaces.delete(namespace);
        socket.leave(`namespace:${namespace}`);
        
        logger.info('Client left namespace', {
          socketId: socket.id,
          userId: client.userId,
          namespace
        });
      }
    });
    
    // Handle disconnection
    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      const client = connectedClients.get(socket.id);
      if (client) {
        logger.info('WebSocket client disconnected', {
          socketId: socket.id,
          userId: client.userId,
          reason,
          duration: Date.now() - client.connectedAt.getTime()
        });
        
        connectedClients.delete(socket.id);
      }
    });
    
    // Send initial cluster data
    sendClusterData(socket);
  });
  
  // Start periodic updates
  startPeriodicUpdates(io);
  
  return io;
}

// Send initial namespace data to client
async function sendNamespaceData(socket, namespace) {
  try {
    if (!KubernetesService.isAvailable()) {
      socket.emit(WS_EVENTS.ERROR, {
        message: 'Kubernetes cluster not available',
        code: 'K8S_UNAVAILABLE'
      });
      return;
    }
    
    const [pods, deployments, services] = await Promise.all([
      KubernetesService.getPods(namespace),
      KubernetesService.getDeployments(namespace),
      KubernetesService.getServices(namespace)
    ]);
    
    socket.emit(WS_EVENTS.POD_UPDATE, {
      namespace,
      pods,
      timestamp: new Date().toISOString()
    });
    
    socket.emit(WS_EVENTS.DEPLOYMENT_UPDATE, {
      namespace,
      deployments,
      timestamp: new Date().toISOString()
    });
    
    socket.emit(WS_EVENTS.SERVICE_UPDATE, {
      namespace,
      services,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to send namespace data:', error);
    socket.emit(WS_EVENTS.ERROR, {
      message: 'Failed to fetch namespace data',
      code: 'NAMESPACE_DATA_ERROR',
      namespace
    });
  }
}

// Send initial cluster data to client
async function sendClusterData(socket) {
  try {
    if (!KubernetesService.isAvailable()) {
      socket.emit(WS_EVENTS.ERROR, {
        message: 'Kubernetes cluster not available',
        code: 'K8S_UNAVAILABLE'
      });
      return;
    }
    
    const [clusterInfo, nodes, namespaces] = await Promise.all([
      KubernetesService.getClusterInfo(),
      KubernetesService.getNodes(),
      KubernetesService.getNamespaces()
    ]);
    
    socket.emit(WS_EVENTS.CLUSTER_UPDATE, {
      clusterInfo,
      timestamp: new Date().toISOString()
    });
    
    socket.emit(WS_EVENTS.NODE_UPDATE, {
      nodes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to send cluster data:', error);
    socket.emit(WS_EVENTS.ERROR, {
      message: 'Failed to fetch cluster data',
      code: 'CLUSTER_DATA_ERROR'
    });
  }
}

// Start periodic updates for real-time data
function startPeriodicUpdates(io) {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(async () => {
    if (connectedClients.size === 0) {
      return; // No clients connected, skip update
    }
    
    try {
      await broadcastUpdates(io);
    } catch (error) {
      logger.error('Failed to broadcast periodic updates:', error);
    }
  }, 30000); // Update every 30 seconds
  
  logger.info('Started periodic WebSocket updates');
}

// Broadcast updates to all connected clients
async function broadcastUpdates(io) {
  if (!KubernetesService.isAvailable()) {
    return;
  }
  
  try {
    // Get cluster-wide data
    const [clusterInfo, nodes, events] = await Promise.all([
      KubernetesService.getClusterInfo(),
      KubernetesService.getNodes(),
      KubernetesService.getEvents(null, 50) // Get recent events
    ]);
    
    // Broadcast cluster updates
    io.emit(WS_EVENTS.CLUSTER_UPDATE, {
      clusterInfo,
      timestamp: new Date().toISOString()
    });
    
    io.emit(WS_EVENTS.NODE_UPDATE, {
      nodes,
      timestamp: new Date().toISOString()
    });
    
    io.emit(WS_EVENTS.EVENT_UPDATE, {
      events: events.slice(0, 10), // Send only the 10 most recent events
      timestamp: new Date().toISOString()
    });
    
    // Get namespace-specific data for subscribed namespaces
    const subscribedNamespaces = new Set();
    connectedClients.forEach(client => {
      client.namespaces.forEach(ns => subscribedNamespaces.add(ns));
    });
    
    for (const namespace of subscribedNamespaces) {
      const [pods, deployments, services] = await Promise.all([
        KubernetesService.getPods(namespace),
        KubernetesService.getDeployments(namespace),
        KubernetesService.getServices(namespace)
      ]);
      
      // Broadcast to namespace-specific room
      io.to(`namespace:${namespace}`).emit(WS_EVENTS.POD_UPDATE, {
        namespace,
        pods,
        timestamp: new Date().toISOString()
      });
      
      io.to(`namespace:${namespace}`).emit(WS_EVENTS.DEPLOYMENT_UPDATE, {
        namespace,
        deployments,
        timestamp: new Date().toISOString()
      });
      
      io.to(`namespace:${namespace}`).emit(WS_EVENTS.SERVICE_UPDATE, {
        namespace,
        services,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Failed to broadcast updates:', error);
    
    // Broadcast error to all clients
    io.emit(WS_EVENTS.ERROR, {
      message: 'Failed to fetch latest data',
      code: 'BROADCAST_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

// Send targeted update to specific namespace
export function broadcastNamespaceUpdate(io, namespace, updateType, data) {
  io.to(`namespace:${namespace}`).emit(updateType, {
    namespace,
    ...data,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Broadcasted namespace update', {
    namespace,
    updateType,
    clientsInRoom: io.sockets.adapter.rooms.get(`namespace:${namespace}`)?.size || 0
  });
}

// Get WebSocket statistics
export function getWebSocketStats() {
  const stats = {
    connectedClients: connectedClients.size,
    namespaceSubscriptions: {},
    totalSubscriptions: 0
  };
  
  connectedClients.forEach(client => {
    client.namespaces.forEach(namespace => {
      if (!stats.namespaceSubscriptions[namespace]) {
        stats.namespaceSubscriptions[namespace] = 0;
      }
      stats.namespaceSubscriptions[namespace]++;
      stats.totalSubscriptions++;
    });
  });
  
  return stats;
}

// Cleanup on process exit
process.on('beforeExit', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    logger.info('Stopped periodic WebSocket updates');
  }
});

export { WS_EVENTS };