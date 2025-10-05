import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringAPI } from '../services/api';

/**
 * Enhanced monitoring data hook with advanced features:
 * - Automatic refresh with configurable intervals
 * - Error handling with retry logic and exponential backoff
 * - Connection status tracking
 * - Historical data collection and caching
 * - WebSocket support for real-time updates
 * - Performance optimization with request debouncing
 */
export const useMonitoringData = ({
  autoRefresh = true,
  refreshInterval = 30000,
  retryCount = 3,
  enableHistoricalData = false,
  enableWebSocket = false,
  maxHistoricalPoints = 100
} = {}) => {
  // State management
  const [clusterMetrics, setClusterMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [historicalData, setHistoricalData] = useState({
    cpu: [],
    memory: [],
    pods: [],
    nodes: []
  });
  
  // Refs for cleanup and control
  const intervalRef = useRef(null);
  const wsRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Retry logic with exponential backoff
  const [retryAttempt, setRetryAttempt] = useState(0);
  const maxRetryDelay = 60000; // 1 minute max delay
  
  const getRetryDelay = (attempt) => {
    return Math.min(1000 * Math.pow(2, attempt), maxRetryDelay);
  };

  // Add data to historical collection
  const addToHistoricalData = useCallback((metrics) => {
    if (!enableHistoricalData || !metrics) return;
    
    const timestamp = Date.now();
    
    setHistoricalData(prev => {
      const newData = { ...prev };
      
      // Add CPU data
      if (metrics.resourceUsage?.cpu) {
        newData.cpu = [...prev.cpu, {
          timestamp,
          value: metrics.resourceUsage.cpu.percentage
        }].slice(-maxHistoricalPoints);
      }
      
      // Add Memory data
      if (metrics.resourceUsage?.memory) {
        newData.memory = [...prev.memory, {
          timestamp,
          value: metrics.resourceUsage.memory.percentage
        }].slice(-maxHistoricalPoints);
      }
      
      // Add Pods data
      if (metrics.cluster?.pods) {
        newData.pods = [...prev.pods, {
          timestamp,
          value: metrics.cluster.pods.total
        }].slice(-maxHistoricalPoints);
      }
      
      // Add Nodes data
      if (metrics.cluster?.nodes) {
        newData.nodes = [...prev.nodes, {
          timestamp,
          value: metrics.cluster.nodes.total
        }].slice(-maxHistoricalPoints);
      }
      
      return newData;
    });
  }, [enableHistoricalData, maxHistoricalPoints]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket) return;
    
    try {
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://dashboard.grepmind.com'}/ws/monitoring`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setRetryAttempt(0);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'metrics') {
            setClusterMetrics(data.payload);
            setLastUpdated(new Date());
            addToHistoricalData(data.payload);
            setError(null);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not intentional
        if (event.code !== 1000 && mountedRef.current) {
          setTimeout(() => {
            if (mountedRef.current) {
              setConnectionStatus('reconnecting');
              connectWebSocket();
            }
          }, getRetryDelay(retryAttempt));
          
          setRetryAttempt(prev => prev + 1);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [enableWebSocket, retryAttempt, addToHistoricalData]);

  // Fetch data via HTTP API
  const fetchMetricsData = useCallback(async (isAutoRefresh = false) => {
    if (!mountedRef.current) return;
    
    try {
      // Set appropriate loading state
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setError(null);
      
      // If WebSocket is enabled, don't fetch via HTTP unless it's disconnected
      if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }
      
      setConnectionStatus('connecting');
      
      const data = await monitoringAPI.getMetricsOverview();
      
      if (mountedRef.current && data) {
        setClusterMetrics(data);
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        setRetryAttempt(0);
        addToHistoricalData(data);
      }
      
    } catch (error) {
      console.error('Error fetching cluster metrics:', error);
      
      if (mountedRef.current) {
        setError(error.message || 'Failed to fetch cluster metrics');
        setConnectionStatus('disconnected');
        
        // Don't clear existing data on refresh errors
        if (!isAutoRefresh) {
          setClusterMetrics(null);
        }
        
        // Retry logic for failed requests
        if (retryAttempt < retryCount) {
          const delay = getRetryDelay(retryAttempt);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryAttempt(prev => prev + 1);
              fetchMetricsData(isAutoRefresh);
            }
          }, delay);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [retryAttempt, retryCount, enableWebSocket, addToHistoricalData]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    fetchMetricsData(false);
  }, [fetchMetricsData]);

  // Set auto-refresh interval
  const setAutoRefreshInterval = useCallback((interval) => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set new interval if autoRefresh is enabled and interval > 0
    if (autoRefresh && interval > 0) {
      intervalRef.current = setInterval(() => {
        fetchMetricsData(true);
      }, interval);
    }
  }, [autoRefresh, fetchMetricsData]);

  // Initialize WebSocket connection if enabled
  useEffect(() => {
    if (enableWebSocket) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [enableWebSocket, connectWebSocket]);

  // Set up auto-refresh interval
  useEffect(() => {
    setAutoRefreshInterval(refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, setAutoRefreshInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchMetricsData(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear intervals and timeouts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  return {
    // Data
    clusterMetrics,
    historicalData,
    
    // Loading states
    isLoading,
    isRefreshing,
    
    // Error and connection status
    error,
    connectionStatus,
    
    // Metadata
    lastUpdated,
    retryAttempt,
    
    // Actions
    refreshData,
    setAutoRefreshInterval,
    
    // WebSocket controls
    reconnectWebSocket: connectWebSocket
  };
};

export default useMonitoringData;
