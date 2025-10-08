import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Activity, 
  Bell, 
  TrendingUp,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import NamespaceSelector from '../components/NamespaceSelector';
import { monitoringAPI } from '../services/api';
import { useMonitoringData } from '../hooks/useMonitoringData';
import ChartContainer from '../components/charts/ChartContainer';
import FilterDropdowns from '../components/FilterDropdowns';
import FilteredGraphs from '../components/FilteredGraphs';
import TimeRangeSelector, { getTimeRangeInfo } from '../components/TimeRangeSelector';

const MonitoringPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('metrics');
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [showHistoricalData, setShowHistoricalData] = useState(true); // Enable by default for charts
  const [enableRealTime, setEnableRealTime] = useState(true);
  const [showGraphView, setShowGraphView] = useState(false);
  
  // NEW: Time series functionality
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [timeRangeInfo, setTimeRangeInfo] = useState(null);

  // NEW: Time range change handler
  const handleTimeRangeChange = (newRange, timeInfo) => {
    setSelectedTimeRange(newRange);
    setTimeRangeInfo(timeInfo);
    
    // Adjust refresh interval based on time range
    if (newRange === '15m' || newRange === '1h') {
      setRefreshInterval(30000); // 30 seconds for short ranges
    } else if (newRange === '1d') {
      setRefreshInterval(300000); // 5 minutes for daily
    } else {
      setRefreshInterval(600000); // 10 minutes for longer ranges
    }
    
    // Force refresh with new time range
    refreshData();
  };

  // Use the enhanced monitoring hook with all 3 options implemented
  const {
    clusterMetrics,
    historicalData,
    isLoading,
    isRefreshing,
    error,
    connectionStatus,
    wsConnected,
    lastUpdated,
    retryAttempt,
    reconnectAttempts,
    refreshData,
    reconnectWebSocket,
    clearError
  } = useMonitoringData({
    autoRefresh: true,
    refreshInterval,
    retryCount: 3,
    enableHistoricalData: showHistoricalData,
    enableWebSocket: enableRealTime,
    maxHistoricalPoints: 100,
    persistState: true // Option 1: Prevent data loss on refresh
  });

  // Debug: Log data for troubleshooting
  useEffect(() => {
    console.log('🔍 MonitoringPage Data Debug:', {
      clusterMetrics,
      historicalData,
      wsConnected,
      showGraphView,
      enableHistoricalData: showHistoricalData,
      enableWebSocket: enableRealTime
    });
  }, [clusterMetrics, historicalData, wsConnected, showGraphView, showHistoricalData, enableRealTime]);

  // Connection status indicator
  const getConnectionStatusInfo = () => {
    if (wsConnected && enableRealTime) {
      return {
        icon: Network,
        text: 'Live Data (WebSocket)',
        color: 'text-success-400',
        bgColor: 'bg-success-500/20',
        pulse: true
      };
    } else if (connectionStatus === 'connecting') {
      return {
        icon: RefreshCw,
        text: 'Connecting...',
        color: 'text-warning-400',
        bgColor: 'bg-warning-500/20',
        pulse: true
      };
    } else if (connectionStatus === 'error') {
      return {
        icon: AlertTriangle,
        text: 'Connection Error',
        color: 'text-error-400',
        bgColor: 'bg-error-500/20',
        pulse: false
      };
    } else {
      return {
        icon: Clock,
        text: 'Polling Data',
        color: 'text-secondary-400',
        bgColor: 'bg-secondary-500/20',
        pulse: false
      };
    }
  };

  const connectionInfo = getConnectionStatusInfo();

  const tabs = [
    { id: 'metrics', label: 'Metrics', icon: BarChart3, description: 'CPU, Memory, Storage usage dashboards' },
    { id: 'events', label: 'Events', icon: Zap, description: 'Real-time K8s events and alerts' },
    { id: 'performance', label: 'Performance', icon: TrendingUp, description: 'Historical performance analytics' },
    { id: 'alerts', label: 'Alerts', icon: Bell, description: 'Alert rules and notification management' },
    { id: 'trends', label: 'Trends', icon: Activity, description: 'Long-term resource usage trends' }
  ];

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Enhanced Monitoring</h1>
          <p className="text-secondary-400 mt-1">Advanced cluster monitoring with real-time updates</p>
        </div>
        <div className="flex items-center space-x-3">
          <NamespaceSelector
            value={selectedNamespace}
            onChange={setSelectedNamespace}
            includeAllOption={true}
          />
          
          {/* NEW: Time Range Selector */}
          <TimeRangeSelector
            selectedRange={selectedTimeRange}
            onRangeChange={handleTimeRangeChange}
            showLabel={false}
            size="sm"
          />
          <div className="flex items-center space-x-2 text-sm">
            <div className={`p-2 rounded-lg border ${connectionInfo.bgColor} border-opacity-30`}>
              <div className="flex items-center space-x-2">
                <connectionInfo.icon className={`w-4 h-4 ${connectionInfo.color} ${connectionInfo.pulse ? 'animate-pulse' : ''}`} />
                <span className={connectionInfo.color}>{connectionInfo.text}</span>
                {retryAttempt > 0 && (
                  <span className="text-xs text-warning-400">(Attempt {retryAttempt}/3)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showHistoricalData}
                onChange={(e) => setShowHistoricalData(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-secondary-400">Historical</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={enableRealTime}
                onChange={(e) => setEnableRealTime(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-secondary-400">Real-time</span>
            </label>
          </div>
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="input-field text-xs"
          >
            <option value={0}>Manual</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <button 
            className="btn btn-secondary"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="CPU Usage" 
          value={clusterMetrics?.resourceUsage?.cpu?.percentage !== undefined ? `${clusterMetrics.resourceUsage.cpu.percentage}%` : 'Loading...'} 
          trend={clusterMetrics?.resourceUsage?.cpu ? `${clusterMetrics.resourceUsage.cpu.used}/${clusterMetrics.resourceUsage.cpu.total} cores` : ''} 
          icon={Cpu} 
          color={clusterMetrics?.resourceUsage?.cpu?.percentage > 80 ? 'error' : clusterMetrics?.resourceUsage?.cpu?.percentage > 60 ? 'warning' : 'success'} 
          historical={historicalData?.cpu}
          onGraphClick={() => setShowGraphView(true)}
        />
        <StatCard 
          title="Memory Usage" 
          value={clusterMetrics?.resourceUsage?.memory?.percentage !== undefined ? `${clusterMetrics.resourceUsage.memory.percentage}%` : 'Loading...'} 
          trend={clusterMetrics?.resourceUsage?.memory ? `${clusterMetrics.resourceUsage.memory.used}/${clusterMetrics.resourceUsage.memory.total} MB` : ''} 
          icon={HardDrive} 
          color={clusterMetrics?.resourceUsage?.memory?.percentage > 85 ? 'error' : clusterMetrics?.resourceUsage?.memory?.percentage > 70 ? 'warning' : 'success'} 
          historical={historicalData?.memory}
          onGraphClick={() => setShowGraphView(true)}
        />
        <StatCard 
          title="Total Pods" 
          value={clusterMetrics ? clusterMetrics.cluster.pods.total.toString() : 'Loading...'} 
          trend={clusterMetrics ? `${clusterMetrics.cluster.pods.running} running` : ''} 
          icon={Network} 
          color="primary" 
          historical={historicalData?.pods}
          onGraphClick={() => setShowGraphView(true)}
        />
        <StatCard 
          title="Cluster Nodes" 
          value={clusterMetrics ? clusterMetrics.cluster.nodes.total.toString() : 'Loading...'} 
          trend={clusterMetrics ? `${clusterMetrics.cluster.nodes.ready} ready` : ''} 
          icon={clusterMetrics?.cluster.nodes.notReady > 0 ? AlertTriangle : CheckCircle} 
          color={clusterMetrics?.cluster.nodes.notReady > 0 ? 'error' : 'success'} 
          historical={historicalData?.nodes}
          onGraphClick={() => setShowGraphView(true)}
        />
      </div>

      {/* Tab Navigation */}
      <div className="bg-secondary-800/50 backdrop-blur-sm rounded-xl border border-secondary-700/50 overflow-hidden">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 px-6 py-4 text-left transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-transparent text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <tab.icon className="w-5 h-5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs opacity-70 truncate">{tab.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-secondary-800/30 backdrop-blur-sm rounded-xl border border-secondary-700/50 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {activeTab === 'metrics' && <MetricsTab namespace={selectedNamespace} historicalData={showHistoricalData ? historicalData : null} selectedTimeRange={selectedTimeRange} />}
            {activeTab === 'events' && <EventsTab namespace={selectedNamespace} />}
            {activeTab === 'performance' && <PerformanceTab namespace={selectedNamespace} />}
            {activeTab === 'alerts' && <AlertsTab namespace={selectedNamespace} />}
            {activeTab === 'trends' && <TrendsTab namespace={selectedNamespace} historicalData={historicalData} />}
          </>
        )}
      </div>

      {/* ECharts Graph View Modal */}
      <ChartContainer
        isVisible={showGraphView}
        onClose={() => setShowGraphView(false)}
        clusterMetrics={clusterMetrics}
        historicalData={historicalData}
        wsConnected={wsConnected}
      />
    </motion.div>
  );
};

// Enhanced Stat Card Component with Historical Data
const StatCard = ({ title, value, trend, icon: Icon, color, historical, onGraphClick }) => {
  const colorClasses = {
    primary: 'text-primary-400 bg-primary-500/20 border-primary-500/30',
    success: 'text-success-400 bg-success-500/20 border-success-500/30',
    warning: 'text-warning-400 bg-warning-500/20 border-warning-500/30',
    error: 'text-error-400 bg-error-500/20 border-error-500/30'
  };

  const getSparklineData = () => {
    if (!historical || historical.length === 0) return [];
    
    return historical.slice(-20).map(point => point.value || 0); // Last 20 points
  };

  const sparklineData = getSparklineData();
  const hasHistoricalData = sparklineData.length > 0;

  return (
    <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-secondary-400">{title}</p>
          <p className="text-2xl font-bold text-secondary-100 mt-1">{value}</p>
          <p className="text-xs text-secondary-500 mt-1">{trend}</p>
          
          {/* Historical trend indicator */}
          {hasHistoricalData && (
            <div className="mt-2">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-secondary-400">Trend:</span>
                <MiniSparkline data={sparklineData} color={color} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Graph Icon Button */}
          {onGraphClick && (
            <button
              onClick={onGraphClick}
              className="p-2 rounded-lg border border-secondary-600/50 bg-secondary-700/30 hover:bg-secondary-600/50 transition-all duration-200 hover:scale-105 group"
              title="Open Graph View"
            >
              <BarChart3 className="w-4 h-4 text-secondary-400 group-hover:text-secondary-200" />
            </button>
          )}
          
          {/* Main Metric Icon */}
          <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Mini Sparkline Component for StatCard with NaN protection
const MiniSparkline = ({ data, color }) => {
  if (!data || data.length === 0) return null;

  // 🔥 FIX 1: Filter out invalid values (NaN, null, undefined, Infinity)
  const validData = data.filter(point => 
    typeof point === 'number' && 
    !isNaN(point) && 
    isFinite(point)
  );
  
  if (validData.length === 0) return null;

  // 🔥 FIX 2: Safe math operations with fallbacks
  const max = Math.max(...validData);
  const min = Math.min(...validData);
  const range = max - min;

  const colorClasses = {
    primary: 'stroke-primary-400',
    success: 'stroke-success-400',
    warning: 'stroke-warning-400',
    error: 'stroke-error-400'
  };

  return (
    <svg width="50" height="20" className="inline-block">
      <path
        d={validData.map((point, index) => {
          // 🔥 FIX 3: Ensure valid coordinates with fallbacks
          const x = validData.length > 1 ? (index / (validData.length - 1)) * 48 + 1 : 25;
          const y = range > 0 ? (1 - (point - min) / range) * 18 + 1 : 10;
          
          // 🔥 FIX 4: Double-check coordinates are valid numbers
          const safeX = isFinite(x) ? x : 25;
          const safeY = isFinite(y) ? y : 10;
          
          return `${index === 0 ? 'M' : 'L'} ${safeX} ${safeY}`;
        }).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={colorClasses[color] || 'stroke-secondary-400'}
      />
    </svg>
  );
};

// Metrics Tab Component
const MetricsTab = ({ namespace, historicalData, selectedTimeRange }) => {
  const [nodeMetrics, setNodeMetrics] = useState([]);
  const [podMetrics, setPodMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  
  // New state for filtering
  const [activeFilters, setActiveFilters] = useState(null);

  useEffect(() => {
    fetchMetricsData();
  }, [namespace, timeRange]);

  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      
      // Fetch node metrics
      const nodeData = await monitoringAPI.getNodeMetrics();
      setNodeMetrics(nodeData || []);

      // Fetch pod metrics with namespace filter
      const ns = namespace === 'all' ? undefined : namespace;
      const podData = await monitoringAPI.getPodMetrics(ns);
      setPodMetrics(podData || []);

    } catch (error) {
      console.error('Error fetching metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls Section */}
      <FilterDropdowns 
        onFilterChange={handleFilterChange}
        className="mb-6"
      />

      {/* Filtered Graphs Section */}
      <FilteredGraphs 
        filters={activeFilters}
        timeRange={selectedTimeRange}
        className="mb-8"
      />

      {/* Original Dashboard Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Resource Metrics Dashboard</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button 
            onClick={fetchMetricsData}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node Metrics */}
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Node Resource Usage</h4>
            <div className="space-y-4">
              {nodeMetrics.length === 0 ? (
                <p className="text-secondary-400 text-center py-4">No node data available</p>
              ) : (
                nodeMetrics.map((node, index) => (
                  <div key={index} className="p-4 bg-secondary-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-secondary-200">{node.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        node.status === 'Ready' ? 'bg-success-500/20 text-success-400' : 'bg-error-500/20 text-error-400'
                      }`}>
                        {node.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex justify-between">
                          <span className="text-secondary-400">CPU:</span>
                          <span className="text-secondary-200">{node.metrics.cpu.percentage}%</span>
                        </div>
                        <div className="w-full bg-secondary-600 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              node.metrics.cpu.percentage > 80 ? 'bg-error-500' : 
                              node.metrics.cpu.percentage > 60 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${Math.min(100, node.metrics.cpu.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-secondary-400">Memory:</span>
                          <span className="text-secondary-200">{node.metrics.memory.percentage}%</span>
                        </div>
                        <div className="w-full bg-secondary-600 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              node.metrics.memory.percentage > 85 ? 'bg-error-500' : 
                              node.metrics.memory.percentage > 70 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${Math.min(100, node.metrics.memory.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-secondary-400">
                      Pods: {node.metrics.pods.current}/{node.metrics.pods.capacity}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Pod Metrics */}
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">
              Pod Resource Usage {namespace !== 'all' ? `(${namespace})` : ''}
            </h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {podMetrics.length === 0 ? (
                <p className="text-secondary-400 text-center py-4">No pod data available</p>
              ) : (
                podMetrics.slice(0, 10).map((pod, index) => ( // Show top 10 pods
                  <div key={index} className="p-3 bg-secondary-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-secondary-200 text-sm truncate">{pod.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        pod.status === 'Running' ? 'bg-success-500/20 text-success-400' : 
                        pod.status === 'Pending' ? 'bg-warning-500/20 text-warning-400' :
                        'bg-error-500/20 text-error-400'
                      }`}>
                        {pod.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-secondary-400">CPU: {pod.metrics.cpu.percentage}%</span>
                        <div className="w-full bg-secondary-600 rounded-full h-1 mt-1">
                          <div 
                            className="h-1 rounded-full bg-primary-500"
                            style={{ width: `${Math.min(100, pod.metrics.cpu.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-400">Mem: {pod.metrics.memory.percentage}%</span>
                        <div className="w-full bg-secondary-600 rounded-full h-1 mt-1">
                          <div 
                            className="h-1 rounded-full bg-success-500"
                            style={{ width: `${Math.min(100, pod.metrics.memory.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-secondary-500">
                      Node: {pod.node} | Restarts: {pod.restarts}
                    </div>
                  </div>
                ))
              )}
              {podMetrics.length > 10 && (
                <div className="text-center text-xs text-secondary-400 py-2">
                  Showing top 10 of {podMetrics.length} pods
                </div>
              )}
            </div>
          </div>
          
          {/* Cluster Overview Chart Areas */}
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">CPU Usage Trends</h4>
            <div className="h-48 flex items-center justify-center text-secondary-400">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Time series chart placeholder</p>
                <p className="text-xs mt-1">Nodes: {nodeMetrics.length} | Range: {timeRange}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Memory Usage Trends</h4>
            <div className="h-48 flex items-center justify-center text-secondary-400">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Time series chart placeholder</p>
                <p className="text-xs mt-1">Pods: {podMetrics.length} | Namespace: {namespace || 'all'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Events Tab Component
const EventsTab = ({ namespace }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, [namespace, eventType]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await monitoringAPI.getEvents(
        namespace === 'all' ? undefined : namespace, 
        eventType === 'all' ? undefined : eventType, 
        50
      );
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Kubernetes Events</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="input-field"
          >
            <option value="all">All Types</option>
            <option value="Normal">Normal</option>
            <option value="Warning">Warning</option>
          </select>
          <button 
            onClick={fetchEvents}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-secondary-400">
          No events found for the selected criteria
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${
                  event.type === 'Warning' 
                    ? 'bg-warning-500/20 text-warning-400' 
                    : 'bg-success-500/20 text-success-400'
                }`}>
                  {event.type === 'Warning' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-sm font-medium ${
                      event.type === 'Warning' ? 'text-warning-400' : 'text-success-400'
                    }`}>
                      {event.reason}
                    </span>
                    <span className="text-xs px-2 py-1 bg-secondary-700 text-secondary-300 rounded">
                      {event.namespace}
                    </span>
                    {event.involvedObject && (
                      <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded">
                        {event.involvedObject.kind}: {event.involvedObject.name}
                      </span>
                    )}
                  </div>
                  <p className="text-secondary-200 text-sm">{event.message}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(event.lastTimestamp || event.firstTimestamp)}</span>
                    </div>
                    {event.count > 1 && (
                      <span className="text-warning-400">Count: {event.count}</span>
                    )}
                    {event.source && (
                      <span>Source: {event.source}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Performance Tab Component
const PerformanceTab = ({ namespace }) => {
  const { user } = useAuthStore();
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [metric, setMetric] = useState('cpu');

  useEffect(() => {
    fetchPerformanceData();
  }, [namespace, timeRange, metric]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const data = await monitoringAPI.getPerformanceTrends(timeRange, metric);
      setPerformanceData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Performance Analytics</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="input-field"
          >
            <option value="cpu">CPU Usage</option>
            <option value="memory">Memory Usage</option>
          </select>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <button 
            onClick={fetchPerformanceData}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : performanceData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Cards */}
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Current Metrics Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-primary-400">{performanceData.summary.current}%</p>
                <p className="text-sm text-secondary-400">Current</p>
              </div>
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-secondary-200">{Math.round(performanceData.summary.average)}%</p>
                <p className="text-sm text-secondary-400">Average</p>
              </div>
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-success-400">{Math.round(performanceData.summary.peak)}%</p>
                <p className="text-sm text-secondary-400">Peak</p>
              </div>
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-warning-400">{Math.round(performanceData.summary.low)}%</p>
                <p className="text-sm text-secondary-400">Low</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-secondary-700/20 rounded">
              <div className="flex items-center space-x-2">
                <TrendingUp className={`w-4 h-4 ${performanceData.summary.trend === 'increasing' ? 'text-warning-400' : 'text-success-400'}`} />
                <span className="text-sm text-secondary-300">
                  Trend: {performanceData.summary.trend} 
                  {performanceData.summary.trendPercentage && ` (${Math.round(performanceData.summary.trendPercentage)}%)`}
                </span>
              </div>
            </div>
          </div>

          {/* Cluster Info */}
          {performanceData.metadata && (
            <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
              <h4 className="font-medium text-secondary-100 mb-4">Cluster Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary-400">Total Pods:</span>
                  <span className="text-secondary-200">{performanceData.metadata.totalPods}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Running Pods:</span>
                  <span className="text-success-400">{performanceData.metadata.runningPods}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Total Nodes:</span>
                  <span className="text-secondary-200">{performanceData.metadata.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Total Capacity:</span>
                  <span className="text-secondary-200">{performanceData.metadata.totalCapacity} {performanceData.metadata.units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Current Usage:</span>
                  <span className="text-primary-400">{performanceData.metadata.currentUsage} {performanceData.metadata.units}</span>
                </div>
              </div>
            </div>
          )}

          {/* Time Series Chart Area */}
          <div className="lg:col-span-2 bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">
              {metric.charAt(0).toUpperCase() + metric.slice(1)} Usage Over Time
            </h4>
            <div className="h-64 flex items-center justify-center text-secondary-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2" />
                <p>Time series chart will be implemented here</p>
                <p className="text-xs mt-2">Data points: {performanceData.dataPoints?.length || 0}</p>
                <p className="text-xs">Time range: {performanceData.timeRange}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
          <p className="text-secondary-400 text-center py-8">
            No performance data available
          </p>
        </div>
      )}
    </div>
  );
};

// Alerts Tab Component
const AlertsTab = ({ namespace }) => {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    fetchAlerts();
  }, [namespace, severity, status]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await monitoringAPI.getAlerts(severity, status);
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-error-400 bg-error-500/20 border-error-500/30';
      case 'warning': return 'text-warning-400 bg-warning-500/20 border-warning-500/30';
      case 'info': return 'text-primary-400 bg-primary-500/20 border-primary-500/30';
      default: return 'text-secondary-400 bg-secondary-500/20 border-secondary-500/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'warning': return Bell;
      default: return CheckCircle;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Alert Rules & Notifications</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input-field"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
          >
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="all">All Statuses</option>
          </select>
          <button 
            onClick={fetchAlerts}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success-400" />
            <p className="text-secondary-400">No alerts found for the selected criteria</p>
            <p className="text-xs text-secondary-500 mt-2">
              {status === 'active' ? 'Your cluster is running smoothly!' : 'No alerts match your filters'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const SeverityIcon = getSeverityIcon(alert.severity);
            
            return (
              <div key={alert.id} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <SeverityIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-secondary-100">{alert.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        alert.status === 'firing' ? 'bg-error-500/20 text-error-400' : 'bg-success-500/20 text-success-400'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-secondary-200 mb-4">{alert.message}</p>
                    
                    {/* Labels */}
                    {alert.labels && Object.keys(alert.labels).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(alert.labels).map(([key, value]) => (
                          <span key={key} className="text-xs px-2 py-1 bg-secondary-700 text-secondary-300 rounded">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Timestamps */}
                    <div className="flex items-center space-x-4 text-xs text-secondary-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Started: {formatTimeAgo(alert.startsAt)}</span>
                      </div>
                      {alert.endsAt && (
                        <span>Ended: {formatTimeAgo(alert.endsAt)}</span>
                      )}
                      {alert.namespace && (
                        <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded">
                          {alert.namespace}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Trends Tab Component
const TrendsTab = ({ namespace, historicalData }) => {
  const { user } = useAuthStore();
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState('cpu');
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchTrendsData();
  }, [namespace, metric, timeRange]);

  const fetchTrendsData = async () => {
    try {
      setLoading(true);
      const data = await monitoringAPI.getPerformanceTrends(timeRange, metric);
      setTrendsData(data);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Resource Usage Trends</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="input-field"
          >
            <option value="cpu">CPU Trends</option>
            <option value="memory">Memory Trends</option>
          </select>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <button 
            onClick={fetchTrendsData}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : trendsData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Trend Summary</h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-primary-400">{trendsData.summary.current}%</p>
                <p className="text-sm text-secondary-400">Current Usage</p>
              </div>
              <div className="text-center p-4 bg-secondary-700/30 rounded-lg">
                <p className="text-2xl font-bold text-secondary-200">{Math.round(trendsData.summary.average)}%</p>
                <p className="text-sm text-secondary-400">Average</p>
              </div>
              <div className="flex items-center justify-center space-x-2 p-3 bg-secondary-700/20 rounded">
                <TrendingUp className={`w-5 h-5 ${trendsData.summary.trend === 'increasing' ? 'text-warning-400' : 'text-success-400'}`} />
                <span className="text-sm text-secondary-300 capitalize">{trendsData.summary.trend}</span>
              </div>
            </div>
          </div>

          {/* Long-term Analysis */}
          <div className="lg:col-span-2 bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Long-term Analysis</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-secondary-700/20 rounded">
                <p className="text-sm text-secondary-400">Peak Usage</p>
                <p className="text-lg font-semibold text-warning-400">{Math.round(trendsData.summary.peak)}%</p>
              </div>
              <div className="p-3 bg-secondary-700/20 rounded">
                <p className="text-sm text-secondary-400">Lowest Usage</p>
                <p className="text-lg font-semibold text-success-400">{Math.round(trendsData.summary.low)}%</p>
              </div>
            </div>
            
            {/* Trend Analysis */}
            <div className="space-y-3">
              <div className="p-4 bg-secondary-700/30 rounded-lg">
                <h5 className="font-medium text-secondary-200 mb-2">Analysis Period</h5>
                <p className="text-sm text-secondary-400">
                  Data points: {trendsData.dataPoints?.length || 0} | 
                  Time range: {trendsData.timeRange} | 
                  Namespace: {trendsData.namespace}
                </p>
              </div>
              
              {trendsData.metadata && (
                <div className="p-4 bg-secondary-700/30 rounded-lg">
                  <h5 className="font-medium text-secondary-200 mb-2">Cluster Context</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm text-secondary-400">
                    <span>Total Capacity: {trendsData.metadata.totalCapacity} {trendsData.metadata.units}</span>
                    <span>Current Usage: {trendsData.metadata.currentUsage} {trendsData.metadata.units}</span>
                    <span>Running Pods: {trendsData.metadata.runningPods}</span>
                    <span>Total Nodes: {trendsData.metadata.totalNodes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Future Chart Area */}
          <div className="lg:col-span-3 bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
            <h4 className="font-medium text-secondary-100 mb-4">Historical Trend Visualization</h4>
            <div className="h-64 flex items-center justify-center text-secondary-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Trend chart will be implemented here</p>
                <p className="text-xs mt-2">
                  Metric: {metric.toUpperCase()} | Range: {timeRange} | 
                  {trendsData.summary.trendPercentage && ` Change: ${Math.round(trendsData.summary.trendPercentage)}%`}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
          <p className="text-secondary-400 text-center py-8">
            No trends data available
          </p>
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;


