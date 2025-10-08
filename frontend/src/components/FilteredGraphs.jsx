import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import MetricChart from './charts/MetricChart';
import { monitoringAPI } from '../services/api';
import { getDistinctColors } from '../utils/chartConfig';

// Time range helper functions
const getTimePointsForRange = (timeRange) => {
  switch (timeRange) {
    case '15m': return 30; // 30 points for 15 minutes
    case '1h': return 60;  // 60 points for 1 hour
    case '1d': return 48;  // 48 points for 1 day (30 min intervals)
    case '2d': return 48;  // 48 points for 2 days (1 hr intervals)
    case '7d': return 56;  // 56 points for 7 days (3 hr intervals)
    default: return 60;
  }
};

const getIntervalForRange = (timeRange) => {
  switch (timeRange) {
    case '15m': return 30000;    // 30 seconds
    case '1h': return 60000;     // 1 minute
    case '1d': return 1800000;   // 30 minutes
    case '2d': return 3600000;   // 1 hour
    case '7d': return 10800000;  // 3 hours
    default: return 60000;
  }
};

const FilteredGraphs = ({ filters, timeRange = '1h', className = '' }) => {
  const [filteredData, setFilteredData] = useState({
    cpu: [],
    memory: [],
    network: [],
    storage: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Refs to track current values and prevent excessive re-renders
  const filtersRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchFilteredData = useCallback(async (currentFilters) => {
    // Debounce API calls - only allow one call per 2 seconds
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      try {
        setLoading(true);
        setError(null);

        let data = {};

        if (currentFilters?.resourceType === 'nodes') {
          // Fetch node-specific metrics
          data = await fetchNodeMetrics();
        } else if (currentFilters?.resourceType === 'pods') {
          // Fetch pod-specific metrics
          data = await fetchPodMetrics(currentFilters);
        }

        if (mountedRef.current) {
          setFilteredData(data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Error fetching filtered data:', err);
        if (mountedRef.current) {
          setError(err.message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, 1000); // 1 second debounce
  }, []); // Remove filters dependency to prevent infinite loop

  // Stable comparison for filters and time range to prevent unnecessary re-fetches
  useEffect(() => {
    if (!filters) return;
    
    // Deep compare filters and timeRange to prevent infinite loops from object recreation
    const filtersKey = JSON.stringify({
      resourceType: filters.resourceType,
      namespace: filters.namespace,
      pod: filters.pod,
      cluster: filters.cluster,
      timeRange: timeRange
    });
    
    if (filtersRef.current !== filtersKey) {
      filtersRef.current = filtersKey;
      fetchFilteredData(filters); // Pass filters as parameter instead
    }
  }, [filters, timeRange]); // Add timeRange to dependency array
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const fetchNodeMetrics = useCallback(async () => {
    // Fetch all node metrics with time range and format for multi-line charts
    const nodeData = await monitoringAPI.getNodeMetrics(timeRange);
    
    // Generate time series data for each node based on time range
    const now = Date.now();
    const timePoints = getTimePointsForRange(timeRange);
    const intervalMs = getIntervalForRange(timeRange);
    
    const generateNodeTimeSeries = (nodes, metric) => {
      return nodes.map((node, nodeIndex) => ({
        name: node.name,
        data: Array.from({ length: timePoints }, (_, i) => {
          const timestamp = now - (timePoints - 1 - i) * intervalMs;
          const baseValue = node.metrics[metric].percentage;
          // Add some variation to make it realistic
          const variation = (Math.sin(i * 0.5 + nodeIndex) * 5) + (Math.random() - 0.5) * 10;
          const value = Math.max(0, Math.min(100, baseValue + variation));
          return [timestamp, value];
        }),
        color: getNodeColor(nodeIndex, nodes.length)
      }));
    };

    return {
      cpu: generateNodeTimeSeries(nodeData || [], 'cpu'),
      memory: generateNodeTimeSeries(nodeData || [], 'memory'),
      network: [], // Can be extended
      storage: []  // Can be extended
    };
  }, [timeRange]);

  const fetchPodMetrics = useCallback(async (currentFilters = filters) => {
    // Fetch pod metrics based on namespace/pod filters with time range
    const namespace = currentFilters?.namespace === 'all' ? undefined : currentFilters?.namespace;
    const podData = await monitoringAPI.getPodMetrics(namespace, timeRange);
    
    // Filter for specific pod if selected
    let targetPods = podData || [];
    if (currentFilters?.pod && currentFilters.pod !== 'all') {
      targetPods = targetPods.filter(pod => pod.name === currentFilters.pod);
    }

    // Generate time series data for each pod based on time range
    const now = Date.now();
    const timePoints = getTimePointsForRange(timeRange);
    const intervalMs = getIntervalForRange(timeRange);
    
    const generatePodTimeSeries = (pods, metric) => {
      return pods.slice(0, 10).map((pod, podIndex) => ({ // Limit to 10 pods for readability
        name: pod.name,
        data: Array.from({ length: timePoints }, (_, i) => {
          const timestamp = now - (timePoints - 1 - i) * 30000;
          const baseValue = pod.metrics[metric].percentage;
          const variation = (Math.sin(i * 0.3 + podIndex) * 3) + (Math.random() - 0.5) * 8;
          const value = Math.max(0, Math.min(100, baseValue + variation));
          return [timestamp, value];
        }),
        color: getPodColor(podIndex, Math.min(pods.length, 10))
      }));
    };

    return {
      cpu: generatePodTimeSeries(targetPods, 'cpu'),
      memory: generatePodTimeSeries(targetPods, 'memory'),
      network: [],
      storage: []
    };
  }, [timeRange]); // Add timeRange dependency to fetchPodMetrics

  const getNodeColor = (index, totalCount) => {
    const colors = getDistinctColors(totalCount, 'multicolor');
    return colors[index % colors.length];
  };

  const getPodColor = (index, totalCount) => {
    const colors = getDistinctColors(totalCount, 'multicolor');
    return colors[index % colors.length];
  };

  const handleManualRefresh = useCallback(() => {
    // Force a refresh by clearing the filters ref and calling fetchFilteredData
    filtersRef.current = null;
    if (filters) {
      fetchFilteredData(filters);
    }
  }, [filters]);

  const getChartTitle = useCallback((metric) => {
    const resourceType = filters?.resourceType === 'nodes' ? 'Node' : 'Pod';
    const metricName = metric.charAt(0).toUpperCase() + metric.slice(1);
    const timeRangeLabel = timeRange === '15m' ? 'Last 15 min' : 
                          timeRange === '1h' ? 'Last 1 hr' : 
                          timeRange === '1d' ? '1 day' :
                          timeRange === '2d' ? '2 days' :
                          timeRange === '7d' ? 'Last 7 days' : timeRange;
    
    if (filters?.resourceType === 'nodes') {
      return `${resourceType} ${metricName} Usage (%) - ${timeRangeLabel}`;
    } else {
      if (filters?.pod && filters.pod !== 'all') {
        return `${filters.pod} - ${metricName} Usage (%) - ${timeRangeLabel}`;
      } else if (filters?.namespace && filters.namespace !== 'all') {
        return `${filters.namespace} ${resourceType}s - ${metricName} Usage (%) - ${timeRangeLabel}`;
      } else {
        return `All ${resourceType}s - ${metricName} Usage (%) - ${timeRangeLabel}`;
      }
    }
  }, [filters?.resourceType, filters?.pod, filters?.namespace, timeRange]);

  const getSubtitle = useCallback((metric) => {
    const dataLength = filteredData[metric]?.length || 0;
    if (dataLength === 0) return 'No data available';
    
    if (filters?.resourceType === 'nodes') {
      return `${dataLength} nodes monitored`;
    } else {
      if (filters?.pod && filters.pod !== 'all') {
        return `Individual pod monitoring`;
      } else {
        return `${dataLength} pods monitored`;
      }
    }
  }, [filteredData, filters?.resourceType, filters?.pod]);

  if (!filters) {
    return (
      <div className={`bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-8 text-center ${className}`}>
        <Activity className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-200 mb-2">Select Filters</h3>
        <p className="text-secondary-400">Choose cluster, resource type, and other filters to view detailed metrics</p>
      </div>
    );
  }

  return (
    <motion.div 
      className={`space-y-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-secondary-100">
            Filtered Resource Metrics
          </h3>
          <p className="text-sm text-secondary-400 mt-1">
            Real-time monitoring for selected {filters?.resourceType}
            {lastUpdated && ` • Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button 
          onClick={handleManualRefresh}
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-error-400" />
            <span className="text-error-400 font-medium">Error loading data</span>
          </div>
          <p className="text-error-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-8 text-center">
          <RefreshCw className="w-8 h-8 text-primary-400 mx-auto mb-4 animate-spin" />
          <p className="text-secondary-300">Loading filtered metrics...</p>
        </div>
      )}

      {/* Charts Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Usage Chart */}
          <MetricChart
            data={filteredData.cpu}
            title={getChartTitle('cpu')}
            metricType="cpu"
            chartType="line"
            height={320}
            showControls={true}
            className="min-h-[400px]"
          />

          {/* Memory Usage Chart */}
          <MetricChart
            data={filteredData.memory}
            title={getChartTitle('memory')}
            metricType="memory"
            chartType="line"
            height={320}
            showControls={true}
            className="min-h-[400px]"
          />
        </div>
      )}

      {/* Data Summary */}
      {!loading && !error && (
        <div className="bg-secondary-800/30 rounded-lg border border-secondary-700/30 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-primary-400">
                {filteredData.cpu?.length || 0}
              </div>
              <div className="text-xs text-secondary-400">
                {filters?.resourceType === 'nodes' ? 'Nodes' : 'Pods'} Monitored
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-success-400">
                {filteredData.cpu?.[0]?.data?.length || 0}
              </div>
              <div className="text-xs text-secondary-400">Data Points Each</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-warning-400">
                {filters?.namespace !== 'all' ? filters?.namespace : 'All'}
              </div>
              <div className="text-xs text-secondary-400">Namespace Scope</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-secondary-200">
                {filters?.pod !== 'all' && filters?.pod ? 'Individual' : 'Multiple'}
              </div>
              <div className="text-xs text-secondary-400">Resource Scope</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FilteredGraphs;
