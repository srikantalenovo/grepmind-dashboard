import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize, Grid, LayoutGrid } from 'lucide-react';
import MetricChart from './MetricChart';
import { formatTimeSeriesData, formatMultiMetricData } from '../../utils/chartConfig';

const ChartContainer = ({ 
  isVisible, 
  onClose, 
  clusterMetrics, 
  historicalData,
  wsConnected 
}) => {
  const [selectedCharts, setSelectedCharts] = useState(['cpu', 'memory', 'pods', 'nodes']);
  const [chartLayout, setChartLayout] = useState('grid'); // 'grid' or 'stack'
  const [fullscreenChart, setFullscreenChart] = useState(null);

  if (!isVisible) return null;

  // Prepare chart data for each metric
  const prepareChartData = (metricType) => {
    // Helper function to generate mock data if historical data is empty
    const generateMockData = (metricType, dataPoints = 20) => {
      const now = Date.now();
      const mockData = [];
      
      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = now - (i * 60000); // 1 minute intervals
        let value;
        
        switch (metricType) {
          case 'cpu':
          case 'memory':
            value = Math.floor(Math.random() * 80) + 10; // 10-90%
            break;
          case 'pods':
          case 'nodes':
            value = Math.floor(Math.random() * 10) + 5; // 5-15 count
            break;
          default:
            value = Math.floor(Math.random() * 100);
        }
        
        mockData.push([timestamp, value]);
      }
      
      return mockData;
    };

    // Debug: Log historical data to understand structure
    console.log(`📊 Preparing chart data for ${metricType}:`, {
      historicalData: historicalData?.[metricType],
      clusterMetrics: clusterMetrics
    });

    switch (metricType) {
      case 'cpu':
        const cpuData = historicalData?.cpu && historicalData.cpu.length > 0 
          ? formatTimeSeriesData(historicalData.cpu, 'percentage')
          : generateMockData('cpu');
        
        return {
          data: [{
            name: 'CPU Usage',
            data: cpuData
          }],
          realTimeData: clusterMetrics?.resourceUsage?.cpu,
          title: 'CPU Usage (%)',
          metricType: 'cpu'
        };
      
      case 'memory':
        const memoryData = historicalData?.memory && historicalData.memory.length > 0 
          ? formatTimeSeriesData(historicalData.memory, 'percentage')
          : generateMockData('memory');
        
        return {
          data: [{
            name: 'Memory Usage',
            data: memoryData
          }],
          realTimeData: clusterMetrics?.resourceUsage?.memory,
          title: 'Memory Usage (%)',
          metricType: 'memory'
        };
      
      case 'pods':
        const podsHasData = historicalData?.pods && historicalData.pods.length > 0;
        const podsTotalData = podsHasData 
          ? formatTimeSeriesData(historicalData.pods, 'total')
          : generateMockData('pods');
        const podsRunningData = podsHasData 
          ? formatTimeSeriesData(historicalData.pods, 'running')
          : generateMockData('pods').map(([time, value]) => [time, Math.max(0, value - 2)]);
        
        return {
          data: [
            {
              name: 'Total Pods',
              data: podsTotalData
            },
            {
              name: 'Running Pods',
              data: podsRunningData
            }
          ],
          realTimeData: clusterMetrics?.cluster?.pods,
          title: 'Pod Metrics',
          metricType: 'pods'
        };
      
      case 'nodes':
        const nodesHasData = historicalData?.nodes && historicalData.nodes.length > 0;
        const nodesTotalData = nodesHasData 
          ? formatTimeSeriesData(historicalData.nodes, 'total')
          : generateMockData('nodes');
        const nodesReadyData = nodesHasData 
          ? formatTimeSeriesData(historicalData.nodes, 'ready')
          : generateMockData('nodes').map(([time, value]) => [time, Math.max(0, value - 1)]);
        
        return {
          data: [
            {
              name: 'Total Nodes',
              data: nodesTotalData
            },
            {
              name: 'Ready Nodes',
              data: nodesReadyData
            }
          ],
          realTimeData: clusterMetrics?.cluster?.nodes,
          title: 'Node Metrics',
          metricType: 'nodes'
        };
      
      default:
        return { 
          data: [{
            name: 'Unknown Metric',
            data: generateMockData('default')
          }], 
          realTimeData: null, 
          title: 'Unknown Metric', 
          metricType: 'default' 
        };
    }
  };

  const availableCharts = [
    { id: 'cpu', name: 'CPU Usage', icon: '🔥' },
    { id: 'memory', name: 'Memory Usage', icon: '💾' },
    { id: 'pods', name: 'Pod Metrics', icon: '🚀' },
    { id: 'nodes', name: 'Node Metrics', icon: '🖥️' }
  ];

  const toggleChartSelection = (chartId) => {
    setSelectedCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  const handleFullscreen = (chartId) => {
    setFullscreenChart(chartId === fullscreenChart ? null : chartId);
  };

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.98 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4"
        initial={{ opacity: 0, backgroundColor: 'rgba(0, 0, 0, 0)' }}
        animate={{ opacity: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        exit={{ opacity: 0, backgroundColor: 'rgba(0, 0, 0, 0)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-7xl bg-secondary-900 rounded-xl border border-secondary-700 shadow-2xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-700">
            <div>
              <h2 className="text-2xl font-bold text-secondary-100">
                📊 Monitoring Dashboard - Graph View
              </h2>
              <p className="text-secondary-400 mt-1">
                Real-time metrics visualization with ECharts
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Chart Selection */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-secondary-400">Charts:</span>
                <div className="flex items-center space-x-1">
                  {availableCharts.map(chart => (
                    <button
                      key={chart.id}
                      onClick={() => toggleChartSelection(chart.id)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                        selectedCharts.includes(chart.id)
                          ? 'bg-primary-500 text-white'
                          : 'bg-secondary-700 text-secondary-400 hover:bg-secondary-600'
                      }`}
                    >
                      {chart.icon} {chart.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Toggle */}
              <div className="flex items-center space-x-1 bg-secondary-700 rounded-lg p-1">
                <button
                  onClick={() => setChartLayout('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    chartLayout === 'grid'
                      ? 'bg-primary-500 text-white'
                      : 'text-secondary-400 hover:text-secondary-200'
                  }`}
                  title="Grid Layout"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartLayout('stack')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    chartLayout === 'stack'
                      ? 'bg-primary-500 text-white'
                      : 'text-secondary-400 hover:text-secondary-200'
                  }`}
                  title="Stack Layout"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              {/* Connection Status */}
              <div className={`px-3 py-1 rounded-lg text-xs flex items-center space-x-2 ${
                wsConnected ? 'bg-success-500/20 text-success-400' : 'bg-warning-500/20 text-warning-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-success-500 animate-pulse' : 'bg-warning-500'
                }`}></div>
                <span>{wsConnected ? 'Live Data' : 'Polling Mode'}</span>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700 rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Charts Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            {selectedCharts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-secondary-300 mb-2">No Charts Selected</h3>
                <p className="text-secondary-500">Select at least one chart to view the data visualization.</p>
              </div>
            ) : fullscreenChart ? (
              // Fullscreen Single Chart
              <motion.div
                key={fullscreenChart}
                variants={chartVariants}
                initial="hidden"
                animate="visible"
              >
                <MetricChart
                  {...prepareChartData(fullscreenChart)}
                  height={500}
                  isFullscreen={true}
                  onToggleFullscreen={() => handleFullscreen(fullscreenChart)}
                  className="w-full"
                />
              </motion.div>
            ) : (
              // Multi-Chart Layout
              <div className={`grid gap-6 ${
                chartLayout === 'grid' 
                  ? selectedCharts.length === 1 
                    ? 'grid-cols-1' 
                    : selectedCharts.length === 2 
                      ? 'grid-cols-1 lg:grid-cols-2' 
                      : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'
                  : 'grid-cols-1'
              }`}>
                {selectedCharts.map((chartId, index) => (
                  <motion.div
                    key={chartId}
                    variants={chartVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    <MetricChart
                      {...prepareChartData(chartId)}
                      height={chartLayout === 'stack' ? 300 : 350}
                      onToggleFullscreen={() => handleFullscreen(chartId)}
                      className="w-full"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChartContainer;

