import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Gauge,
  Maximize2,
  Minimize2,
  Download,
  Settings
} from 'lucide-react';
import { 
  generateLineChartConfig, 
  generateGaugeChartConfig, 
  generateBarChartConfig,
  colorPalette,
  chartTypes,
  webglConfig,
  getDistinctColors
} from '../../utils/chartConfig';

const MetricChart = ({ 
  data, 
  title, 
  metricType, 
  chartType = 'line',
  height = 300,
  realTimeData,
  onChartTypeChange,
  className = '',
  showControls = true,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChartType, setCurrentChartType] = useState(chartType);

  // Initialize chart with proper ref checking and retries
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    
    const initializeChart = () => {
      retryCount++;
      console.log(`🔧 Attempt ${retryCount}: Initializing ECharts instance...`, { 
        chartRef: !!chartRef.current,
        hasElement: chartRef.current instanceof HTMLElement
      });
      
      if (!chartRef.current) {
        if (retryCount < maxRetries) {
          console.log(`⚠️ Chart ref not available, retrying in 50ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(initializeChart, 50);
          return;
        } else {
          console.error('❌ Chart ref never became available after max retries');
          setIsLoading(false);
          return;
        }
      }

      try {
        // Dispose existing instance if any
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }

        // Check if the DOM element has dimensions
        const rect = chartRef.current.getBoundingClientRect();
        console.log('📏 Chart container dimensions:', {
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          element: chartRef.current.tagName
        });

        if (rect.width === 0 || rect.height === 0) {
          if (retryCount < maxRetries) {
            console.warn(`⚠️ Chart container has no dimensions, retrying in 100ms (attempt ${retryCount}/${maxRetries})`);
            setTimeout(initializeChart, 100);
            return;
          } else {
            console.error('❌ Chart container never got dimensions after max retries');
            setIsLoading(false);
            return;
          }
        }

        // Initialize ECharts instance
        console.log('🔧 Creating ECharts instance...');
        chartInstance.current = echarts.init(chartRef.current, null, {
          renderer: 'canvas',
          width: rect.width,
          height: rect.height
        });

        console.log('✅ ECharts instance created successfully:', !!chartInstance.current);
        
        if (chartInstance.current) {
          // Set loading to false to hide loading overlay and allow chart to render
          setIsLoading(false);
          console.log('✅ Chart initialization complete for:', title);
          
          // Clear any existing content in the container (loading spinner etc)
          // ECharts will now take over the container
        } else {
          console.error('❌ Failed to create ECharts instance');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing ECharts:', error);
        setIsLoading(false);
      }
    };

    // Start initialization with a small delay to ensure component is mounted
    const timeoutId = setTimeout(initializeChart, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      console.log('🧹 Cleaning up ECharts instance for:', title);
      
      // Robust cleanup to prevent DOM conflicts
      if (chartInstance.current) {
        try {
          // Check if instance is still valid before disposing
          if (typeof chartInstance.current.dispose === 'function') {
            chartInstance.current.dispose();
          }
        } catch (error) {
          // Suppress warnings about DOM nodes that may already be removed
          console.warn('Chart cleanup warning (safe to ignore):', error.message);
        }
        chartInstance.current = null;
      }
      
      // Clear any pending retry timeouts to prevent memory leaks
      retryCount = maxRetries;
    };
  }, [title]);

  // Update chart when data or type changes
  useEffect(() => {
    console.log('📊 Chart update triggered:', {
      hasInstance: !!chartInstance.current,
      isLoading,
      hasData: data && data.length > 0,
      chartType: currentChartType,
      title
    });

    if (!chartInstance.current) {
      console.log('⚠️ Chart instance not ready yet for:', title);
      return;
    }

    if (isLoading) {
      console.log('⚠️ Chart still loading for:', title);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data provided for chart:', title);
      return;
    }

    // Additional validation for data structure
    const hasValidData = data.some(series => series.data && series.data.length > 0);
    if (!hasValidData) {
      console.log('⚠️ Data structure invalid for chart:', title, data);
      return;
    }

    console.log(`📊 Updating chart "${title}" with data:`, {
      chartType: currentChartType,
      dataLength: data.length,
      firstSeriesLength: data[0]?.data?.length,
      metricType
    });

    const colors = getDistinctColors(data.length, metricType);
    let chartConfig;

    try {
      switch (currentChartType) {
        case 'gauge':
          const currentValue = realTimeData?.percentage || 
                              realTimeData?.value ||
                              data[0]?.data?.[data[0]?.data.length - 1]?.[1] || 
                              0;
          chartConfig = generateGaugeChartConfig(currentValue, title, 100, colors);
          break;
        case 'bar':
          const barData = convertToBarData(data);
          chartConfig = generateBarChartConfig(barData, title, colors);
          break;
        case 'area':
          chartConfig = generateLineChartConfig(data, title, colors, 'area');
          break;
        default:
          chartConfig = generateLineChartConfig(data, title, colors, 'line');
      }

      if (chartConfig && chartConfig.series && chartInstance.current) {
        console.log(`✅ Applying chart config for "${title}":`, {
          seriesCount: chartConfig.series.length,
          chartType: currentChartType
        });
        
        chartInstance.current.setOption(chartConfig, true);
        
        // Force resize after a short delay to ensure proper rendering
        setTimeout(() => {
          if (chartInstance.current && chartRef.current) {
            try {
              chartInstance.current.resize();
              console.log(`✅ Chart resized successfully: ${title}`);
            } catch (resizeError) {
              console.warn(`⚠️ Chart resize warning for ${title}:`, resizeError.message);
            }
          }
        }, 100);
      } else {
        console.error('❌ Invalid chart config or instance for:', title);
      }
    } catch (error) {
      console.error(`❌ Error updating chart "${title}":`, error);
    }
  }, [data, currentChartType, title, metricType, realTimeData, isLoading]);

  // Handle real-time data updates
  useEffect(() => {
    if (!chartInstance.current || !realTimeData || currentChartType === 'gauge') return;

    const now = Date.now();
    const newDataPoint = [now, realTimeData.percentage || realTimeData.value || 0];

    // Update chart with new data point
    chartInstance.current.setOption({
      series: [{
        data: [...(data[0]?.data || []).slice(-50), newDataPoint] // Keep last 50 points
      }]
    });
  }, [realTimeData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current && chartRef.current) {
        try {
          chartInstance.current.resize();
        } catch (error) {
          console.warn('Chart resize warning:', error.message);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Convert time series data to bar chart format
  const convertToBarData = (timeSeriesData) => {
    if (!timeSeriesData || timeSeriesData.length === 0) {
      return { categories: [], series: [] };
    }

    // Take last 10 data points and create categories
    const lastPoints = timeSeriesData[0]?.data?.slice(-10) || [];
    const categories = lastPoints.map((point, index) => `T-${10 - index}`);
    
    return {
      categories,
      series: timeSeriesData.map(series => ({
        name: series.name,
        data: series.data?.slice(-10).map(point => point[1]) || []
      }))
    };
  };

  const handleChartTypeChange = (newType) => {
    setCurrentChartType(newType);
    if (onChartTypeChange) {
      onChartTypeChange(newType);
    }
  };

  const handleExport = () => {
    if (!chartInstance.current) return;
    
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#1F2937'
    });
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_chart.png`;
    link.click();
  };

  const getChartTypeIcon = (type) => {
    switch (type) {
      case 'line': return TrendingUp;
      case 'area': return Activity;
      case 'bar': return BarChart3;
      case 'gauge': return Gauge;
      default: return TrendingUp;
    }
  };

  return (
    <motion.div 
      className={`bg-secondary-800/50 rounded-xl border border-secondary-700/50 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-700/50">
        <div>
          <h3 className="text-lg font-semibold text-secondary-100">{title}</h3>
          <p className="text-sm text-secondary-400">
            {chartTypes[currentChartType]?.description}
          </p>
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-2">
            {/* Chart Type Selector */}
            <div className="flex items-center space-x-1 bg-secondary-700/30 rounded-lg p-1">
              {Object.entries(chartTypes).map(([type, config]) => {
                const IconComponent = getChartTypeIcon(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleChartTypeChange(type)}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      currentChartType === type
                        ? 'bg-primary-500 text-white'
                        : 'text-secondary-400 hover:text-secondary-200 hover:bg-secondary-600/50'
                    }`}
                    title={config.name}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="p-2 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/50 rounded-lg transition-colors duration-200"
              title="Export Chart"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/50 rounded-lg transition-colors duration-200"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="p-4">
        {/* Chart container wrapper with relative positioning for overlays */}
        <div className="relative" style={{ height, width: '100%' }}>
          {/* Pure chart container - ECharts takes full control */}
          <div 
            ref={chartRef} 
            style={{ height: '100%', width: '100%' }}
            className="absolute inset-0"
          />
          
          {/* Loading overlay - positioned absolutely to avoid DOM conflicts */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-800/80 backdrop-blur-sm rounded-lg z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
              <span className="text-sm text-secondary-400">Initializing chart...</span>
            </div>
          )}
          
          {/* No data overlay - positioned absolutely */}
          {!isLoading && (!data || data.length === 0 || !data[0]?.data || data[0].data.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-800/50 rounded-lg z-10">
              <div className="text-4xl mb-3">📊</div>
              <h4 className="text-secondary-300 font-medium mb-1">No Data Available</h4>
              <p className="text-sm text-secondary-500 text-center">
                Waiting for monitoring data to be collected.<br/>
                Charts will appear once data is available.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart Status Footer */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span>
            {realTimeData ? (
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span>Live updates active</span>
              </span>
            ) : (
              'Historical data'
            )}
          </span>
          <span>
            {data?.[0]?.data?.length || 0} data points
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricChart;

