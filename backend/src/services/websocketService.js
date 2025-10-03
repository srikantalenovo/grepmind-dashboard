import { WebSocketServer } from 'ws';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { logger } from '../utils/logger.js';

let wss = null;
let watchStreams = new Map(); // Track active watch streams

export const initializeWebSocket = (server) => {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    logger.info('WebSocket client connected');
    
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
  });
  
  logger.info('WebSocket server initialized');
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
  logger.info('All WebSocket watches cleaned up');
};