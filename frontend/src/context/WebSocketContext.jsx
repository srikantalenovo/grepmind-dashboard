import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// WebSocket context
const WebSocketContext = createContext();

// WebSocket actions
const WS_ACTIONS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
  UPDATE_DATA: 'UPDATE_DATA',
  JOIN_NAMESPACE: 'JOIN_NAMESPACE',
  LEAVE_NAMESPACE: 'LEAVE_NAMESPACE'
};

// Initial state
const initialState = {
  socket: null,
  connected: false,
  connecting: false,
  error: null,
  clusterData: null,
  nodesData: null,
  eventsData: null,
  namespacesData: {},
  joinedNamespaces: new Set()
};

// WebSocket reducer
function wsReducer(state, action) {
  switch (action.type) {
    case WS_ACTIONS.CONNECTING:
      return {
        ...state,
        connecting: true,
        error: null
      };
      
    case WS_ACTIONS.CONNECTED:
      return {
        ...state,
        socket: action.payload,
        connected: true,
        connecting: false,
        error: null
      };
      
    case WS_ACTIONS.DISCONNECTED:
      return {
        ...state,
        socket: null,
        connected: false,
        connecting: false,
        namespacesData: {},
        joinedNamespaces: new Set()
      };
      
    case WS_ACTIONS.ERROR:
      return {
        ...state,
        error: action.payload,
        connecting: false
      };
      
    case WS_ACTIONS.UPDATE_DATA:
      const { type, data } = action.payload;
      
      switch (type) {
        case 'cluster_update':
          return {
            ...state,
            clusterData: data
          };
          
        case 'node_update':
          return {
            ...state,
            nodesData: data
          };
          
        case 'event_update':
          return {
            ...state,
            eventsData: data
          };
          
        case 'pod_update':
        case 'deployment_update':
        case 'service_update':
          return {
            ...state,
            namespacesData: {
              ...state.namespacesData,
              [data.namespace]: {
                ...state.namespacesData[data.namespace],
                [type.replace('_update', 's')]: data
              }
            }
          };
          
        default:
          return state;
      }
      
    case WS_ACTIONS.JOIN_NAMESPACE:
      return {
        ...state,
        joinedNamespaces: new Set([...state.joinedNamespaces, action.payload])
      };
      
    case WS_ACTIONS.LEAVE_NAMESPACE:
      const newJoinedNamespaces = new Set(state.joinedNamespaces);
      newJoinedNamespaces.delete(action.payload);
      return {
        ...state,
        joinedNamespaces: newJoinedNamespaces
      };
      
    default:
      return state;
  }
}

// WebSocket provider component
export function WebSocketProvider({ children }) {
  const [state, dispatch] = useReducer(wsReducer, initialState);
  const { isAuthenticated, token } = useAuth();
  
  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (state.socket) {
        state.socket.disconnect();
        dispatch({ type: WS_ACTIONS.DISCONNECTED });
      }
      return;
    }
    
    // Connect to WebSocket
    dispatch({ type: WS_ACTIONS.CONNECTING });
    
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      retries: 3
    });
    
    // Socket event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      dispatch({
        type: WS_ACTIONS.CONNECTED,
        payload: socket
      });
    });
    
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      dispatch({ type: WS_ACTIONS.DISCONNECTED });
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      dispatch({
        type: WS_ACTIONS.ERROR,
        payload: error.message
      });
      
      if (error.message.includes('Authentication')) {
        toast.error('WebSocket authentication failed');
      }
    });
    
    // Data update handlers
    socket.on('cluster_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'cluster_update', data }
      });
    });
    
    socket.on('node_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'node_update', data }
      });
    });
    
    socket.on('event_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'event_update', data }
      });
    });
    
    socket.on('pod_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'pod_update', data }
      });
    });
    
    socket.on('deployment_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'deployment_update', data }
      });
    });
    
    socket.on('service_update', (data) => {
      dispatch({
        type: WS_ACTIONS.UPDATE_DATA,
        payload: { type: 'service_update', data }
      });
    });
    
    socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      toast.error(data.message || 'WebSocket error occurred');
    });
    
    // Cleanup on unmount
    return () => {
      socket.disconnect();
      dispatch({ type: WS_ACTIONS.DISCONNECTED });
    };
  }, [isAuthenticated, token]);
  
  // WebSocket actions
  const joinNamespace = (namespace) => {
    if (state.socket && state.connected) {
      state.socket.emit('join_namespace', namespace);
      dispatch({
        type: WS_ACTIONS.JOIN_NAMESPACE,
        payload: namespace
      });
    }
  };
  
  const leaveNamespace = (namespace) => {
    if (state.socket && state.connected) {
      state.socket.emit('leave_namespace', namespace);
      dispatch({
        type: WS_ACTIONS.LEAVE_NAMESPACE,
        payload: namespace
      });
    }
  };
  
  const getNamespaceData = (namespace) => {
    return state.namespacesData[namespace] || {};
  };
  
  const value = {
    ...state,
    joinNamespace,
    leaveNamespace,
    getNamespaceData
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}