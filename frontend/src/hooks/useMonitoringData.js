import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringAPI } from '../services/api';

// 🔥 WebSocket data sanitization helper
const sanitizeWebSocketData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitizeValue = (value) => {
    if (typeof value === 'number') {
      return (!isFinite(value) || isNaN(value)) ? 0 : value;
    }
    if (typeof value === 'object' && value !== null) {
      return sanitizeObject(value);
    }
    return value;
  };
  
  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeValue);
    }
    
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeValue(obj[key]);
    });
    return sanitized;
  };
  
  return sanitizeObject(data);
};

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
  // State management with persistence
  const [clusterMetrics, setClusterMetrics] = useState(() => {
    // Try to restore from localStorage on initial load
    try {
      const saved = localStorage.getItem('grepmind-cluster-metrics');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the structure before using it
        if (parsed && typeof parsed === 'object' && parsed.resourceUsage) {
          return parsed;
        }
      }
      return null;
    } catch {
      // Clear corrupted localStorage data
      localStorage.removeItem('grepmind-cluster-metrics');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [wsConnected, setWsConnected] = useState(false);
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

  // Add data to historical collection with NaN protection
  const addToHistoricalData = useCallback((metrics) => {
    if (!enableHistoricalData || !metrics) return;
    
    const timestamp = Date.now();
    
    // 🔥 Helper function to validate numeric values
    // Enhanced validation for historical data
    const isValidNumber = (value) => {
      return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0;
    };
    
    setHistoricalData(prev => {
      const newData = { ...prev };
      
      // Add CPU data with validation
      if (metrics.resourceUsage?.cpu) {
        const cpuValue = metrics.resourceUsage.cpu.percentage;
        if (isValidNumber(cpuValue)) {
          newData.cpu = [...prev.cpu, {
            timestamp,
            value: Math.max(0, Math.min(100, cpuValue)), // Clamp between 0-100
            percentage: Math.max(0, Math.min(100, cpuValue)),
            used: metrics.resourceUsage.cpu.used || 0,
            total: metrics.resourceUsage.cpu.total || 0
          }].slice(-maxHistoricalPoints);
        }
      }
      
      // Add Memory data with validation
      if (metrics.resourceUsage?.memory) {
        const memoryValue = metrics.resourceUsage.memory.percentage;
        if (isValidNumber(memoryValue)) {
          newData.memory = [...prev.memory, {
            timestamp,
            value: Math.max(0, Math.min(100, memoryValue)), // Clamp between 0-100
            percentage: Math.max(0, Math.min(100, memoryValue)),
            used: metrics.resourceUsage.memory.used || 0,
            total: metrics.resourceUsage.memory.total || 0
          }].slice(-maxHistoricalPoints);
        }
      }
      
      // Add Pods data with validation
      if (metrics.cluster?.pods) {
        const podsTotal = metrics.cluster.pods.total;
        const podsRunning = metrics.cluster.pods.running || 0;
        if (isValidNumber(podsTotal) && podsTotal >= 0) {
          newData.pods = [...prev.pods, {
            timestamp,
            value: Math.floor(podsTotal), // Ensure integer
            total: Math.floor(podsTotal),
            running: Math.floor(podsRunning),
            pending: Math.floor(metrics.cluster.pods.pending || 0),
            failed: Math.floor(metrics.cluster.pods.failed || 0)
          }].slice(-maxHistoricalPoints);
        }
      }
      
      // Add Nodes data with validation
      if (metrics.cluster?.nodes) {
        const nodesTotal = metrics.cluster.nodes.total;
        const nodesReady = metrics.cluster.nodes.ready || 0;
        if (isValidNumber(nodesTotal) && nodesTotal >= 0) {
          newData.nodes = [...prev.nodes, {
            timestamp,
            value: Math.floor(nodesTotal), // Ensure integer
            total: Math.floor(nodesTotal),
            ready: Math.floor(nodesReady),
            notReady: Math.floor(metrics.cluster.nodes.notReady || 0)
          }].slice(-maxHistoricalPoints);
        }
      }
      
      return newData;
    });
  }, [enableHistoricalData, maxHistoricalPoints]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket) {
      console.log('🔌 WebSocket disabled via enableWebSocket flag');
      return;
    }
    
    try {
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://dashboard.grepmind.com'}/ws/monitoring`;
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setWsConnected(true);
        setRetryAttempt(0);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'metrics') {
            // 🔥 Sanitize WebSocket data to prevent NaN values
            const sanitizedPayload = sanitizeWebSocketData(data.payload);
            setClusterMetrics(sanitizedPayload);
            setLastUpdated(new Date());
            addToHistoricalData(sanitizedPayload);
            setError(null);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setWsConnected(false);
        
        // Attempt to reconnect if not intentional - but don't start HTTP polling
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
        setWsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
      setWsConnected(false);
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
      
      // Allow HTTP polling as fallback even with WebSocket (with debouncing)
      if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN && isAutoRefresh) {
        // Skip auto-refresh if WebSocket is working, but allow manual refresh
        setIsRefreshing(false);
        setIsLoading(false);
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
        
        // Retry logic for failed requests - but prevent infinite loops
        if (retryAttempt < retryCount && !isAutoRefresh) {
          const delay = getRetryDelay(retryAttempt);
          
          // Clear any existing retry timeout to prevent multiple retries
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryAttempt(prev => prev + 1);
              fetchMetricsData(false); // Force manual retry, not auto-refresh
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
  }, [enableWebSocket]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
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
      console.error('Manual refresh error:', error);
      if (mountedRef.current) {
        setError(error.message || 'Failed to refresh data');
        setConnectionStatus('disconnected');
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Reset state function for debugging
  const resetState = useCallback(async () => {
    console.log('🔄 Resetting monitoring state...');
    setClusterMetrics(null);
    setHistoricalData({ cpu: [], memory: [], pods: [], nodes: [] });
    setError(null);
    setRetryAttempt(0);
    localStorage.removeItem('grepmind-cluster-metrics');
    
    // Force fresh data fetch
    try {
      setIsLoading(true);
      const data = await monitoringAPI.getMetricsOverview();
      
      if (mountedRef.current && data) {
        setClusterMetrics(data);
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        addToHistoricalData(data);
      }
    } catch (error) {
      console.error('Reset state fetch error:', error);
      if (mountedRef.current) {
        setError(error.message || 'Failed to fetch data after reset');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize WebSocket connection if enabled
  useEffect(() => {
    console.log('🔌 WebSocket useEffect triggered. enableWebSocket:', enableWebSocket);
    if (enableWebSocket) {
      console.log('🔌 Starting WebSocket connection...');
      connectWebSocket();
    } else {
      console.log('🔌 WebSocket disabled, will use HTTP polling');
      setWsConnected(false);
      setConnectionStatus('polling');
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [enableWebSocket, connectWebSocket]);

  // Persist cluster metrics to localStorage
  useEffect(() => {
    if (clusterMetrics) {
      try {
        localStorage.setItem('grepmind-cluster-metrics', JSON.stringify(clusterMetrics));
      } catch (error) {
        console.warn('Failed to save metrics to localStorage:', error);
      }
    }
  }, [clusterMetrics]);

  // Set auto-refresh interval with rate limiting
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set new interval if autoRefresh is enabled and interval > 0
    if (autoRefresh && refreshInterval > 0) {
      // Minimum interval of 10 seconds to prevent excessive requests
      const safeInterval = Math.max(refreshInterval, 10000);
      
      intervalRef.current = setInterval(async () => {
        // Rate limiting: only fetch if WebSocket is not active
        if (!enableWebSocket || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          try {
            setIsRefreshing(true);
            setError(null);
            
            const data = await monitoringAPI.getMetricsOverview();
            
            if (mountedRef.current && data) {
              setClusterMetrics(data);
              setLastUpdated(new Date());
              setConnectionStatus('connected');
              setRetryAttempt(0);
              addToHistoricalData(data);
            }
          } catch (error) {
            console.error('Auto-refresh error:', error);
            if (mountedRef.current) {
              setError(error.message || 'Failed to refresh data');
              setConnectionStatus('disconnected');
            }
          } finally {
            if (mountedRef.current) {
              setIsRefreshing(false);
            }
          }
        }
      }, safeInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, enableWebSocket]); // Removed addToHistoricalData dependency to prevent loops

  // Initial data fetch - Using a stable reference to avoid infinite loops
  useEffect(() => {
    let isMounted = true;
    
    const initialFetch = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        setError(null);
        setConnectionStatus('connecting');
        
        const data = await monitoringAPI.getMetricsOverview();
        
        if (isMounted && data) {
          setClusterMetrics(data);
          setLastUpdated(new Date());
          setConnectionStatus('connected');
          setRetryAttempt(0);
          addToHistoricalData(data);
        }
      } catch (error) {
        console.error('Initial fetch error:', error);
        if (isMounted) {
          setError(error.message || 'Failed to fetch cluster metrics');
          setConnectionStatus('disconnected');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initialFetch();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array is now safe

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
    wsConnected,
    
    // Metadata
    lastUpdated,
    retryAttempt,
    reconnectAttempts: retryAttempt, // Alias for compatibility
    
    // Actions
    refreshData,
    resetState,
    clearError,
    
    // WebSocket controls
    reconnectWebSocket: connectWebSocket
  };
};

export default useMonitoringData;

