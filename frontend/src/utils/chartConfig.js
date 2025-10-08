// ECharts configuration utilities for monitoring dashboard
import { format } from 'date-fns';

// Common chart theme configuration - ENHANCED WITH BEAUTIFUL TOOLTIPS
export const chartTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '8%',
    top: '15%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderWidth: 1,
    textStyle: {
      color: '#F1F5F9',
      fontSize: 13,
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    extraCssText: `
      backdrop-filter: blur(12px); 
      border-radius: 12px; 
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      padding: 12px 16px;
      max-width: 300px;
    `,
    axisPointer: {
      type: 'cross',
      crossStyle: {
        color: '#64748B',
        width: 1,
        type: 'dashed'
      },
      lineStyle: {
        color: '#64748B',
        width: 1,
        type: 'dashed'
      }
    },
    formatter: function(params) {
      if (!params || params.length === 0) return '';
      
      // Enhanced tooltip formatting
      const time = new Date(params[0].axisValue).toLocaleString();
      let html = `
        <div style="font-weight: 600; color: #E2E8F0; margin-bottom: 8px; font-size: 14px;">
          📊 ${time}
        </div>
      `;
      
      // Sort by value for better readability
      const sortedParams = [...params].sort((a, b) => b.value[1] - a.value[1]);
      
      sortedParams.forEach((param, index) => {
        const value = param.value[1];
        const color = param.color;
        const name = param.seriesName;
        
        // Add trend indicator
        let trendIcon = '📈';
        if (index > 0 && sortedParams[index-1].value[1] > value) {
          trendIcon = '📉';
        } else if (index === 0) {
          trendIcon = '🔥'; // Highest value
        }
        
        html += `
          <div style="display: flex; align-items: center; margin: 6px 0; padding: 4px 0;">
            <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px ${color}40;"></div>
            <span style="color: #CBD5E1; flex: 1; font-size: 12px;">${name}</span>
            <span style="font-weight: 600; color: #F1F5F9; margin-left: 8px; font-size: 13px;">
              ${trendIcon} ${value.toFixed(2)}%
            </span>
          </div>
        `;
      });
      
      return html;
    }
  },
  legend: {
    textStyle: {
      color: '#9CA3AF',
      fontSize: 11
    },
    top: '5%',
    type: 'scroll',
    pageButtonItemGap: 5,
    pageButtonGap: 10,
    pageIconColor: '#64748B',
    pageIconInactiveColor: '#374151',
    pageTextStyle: {
      color: '#9CA3AF'
    }
  }
};

// Color palette for different metrics - ENHANCED WITH VIBRANT MULTICOLORS
export const colorPalette = {
  // Extended vibrant palette for CPU metrics
  cpu: [
    '#10B981', '#059669', '#047857', '#065F46', '#064E3B', // Greens
    '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5', // Light greens
    '#0D9488', '#0F766E', '#115E59', '#134E4A', '#1E40AF'  // Teals
  ],
  
  // Extended vibrant palette for Memory metrics  
  memory: [
    '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', // Blues
    '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', // Light blues
    '#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81'  // Indigos
  ],
  
  // Extended vibrant palette for Pods metrics
  pods: [
    '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', // Purples
    '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF', // Light purples
    '#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843'  // Pinks
  ],
  
  // Extended vibrant palette for Nodes metrics
  nodes: [
    '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', // Ambers
    '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB', '#F97316', // Light ambers/oranges
    '#EA580C', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'  // Oranges/reds
  ],
  
  // Extended vibrant palette for Storage metrics
  storage: [
    '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', // Reds
    '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2', // Light reds
    '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12'  // Orange-reds
  ],
  
  // Extended vibrant palette for Network metrics
  network: [
    '#06B6D4', '#0891B2', '#0E7490', '#155E75', '#164E63', // Cyans
    '#22D3EE', '#67E8F9', '#A5F3FC', '#CFFAFE', '#ECFEFF', // Light cyans
    '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A'  // Teals
  ],
  
  // ULTIMATE VIBRANT PALETTE - for maximum distinction
  multicolor: [
    // Bright Primary Colors
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    
    // Neon & Electric Colors  
    '#FF10F0', '#10FF10', '#1010FF', '#FFFF10', '#FF1010',
    '#10FFFF', '#FF8010', '#8010FF', '#10FF80', '#FF1080',
    
    // Sophisticated Colors
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#34495E', '#E67E22', '#95A5A6', '#16A085',
    
    // Gradient-style Colors
    '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#B19CD9',
    '#C44569', '#F8B500', '#6C5CE7', '#00B894', '#E17055',
    
    // Modern UI Colors
    '#A8E6CF', '#FFD3A5', '#FD6C9E', '#C44569', '#F8B500',
    '#6C5CE7', '#00B894', '#E17055', '#74B9FF', '#FD79A8',
    
    // Extended Rainbow
    '#FF0080', '#8000FF', '#0080FF', '#00FF80', '#80FF00',
    '#FF8000', '#FF0040', '#4000FF', '#0040FF', '#00FF40'
  ]
};

// Smart color assignment function for maximum distinction
export const getDistinctColors = (count, metricType = 'multicolor') => {
  const baseColors = colorPalette[metricType] || colorPalette.multicolor;
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // For more colors than available, generate variations
  const colors = [...baseColors];
  while (colors.length < count) {
    const baseColor = baseColors[colors.length % baseColors.length];
    // Generate slight variations using HSL adjustments
    const variations = [
      baseColor + 'E6', // More transparent
      baseColor + 'CC', // Medium transparent
      baseColor + 'B3', // Less transparent
    ];
    colors.push(...variations);
  }
  
  return colors.slice(0, count);
};

// Chart type configurations
export const chartTypes = {
  line: {
    name: 'Line Chart',
    icon: '📈',
    description: 'Best for showing trends over time'
  },
  area: {
    name: 'Area Chart',
    icon: '📊',
    description: 'Emphasizes volume and trends'
  },
  bar: {
    name: 'Bar Chart',
    icon: '📶',
    description: 'Good for comparing discrete values'
  },
  gauge: {
    name: 'Gauge Chart',
    icon: '⏱️',
    description: 'Shows current value against a scale'
  },
  scatter: {
    name: 'Scatter Plot',
    icon: '🔵',
    description: 'Shows correlation between metrics'
  }
};

// Generate line chart configuration - ENHANCED WITH VIBRANT COLORS & ANIMATIONS
export const generateLineChartConfig = (data, title, colors, chartType = 'line') => {
  const isAreaChart = chartType === 'area';
  
  // Use smart color assignment for maximum distinction
  const distinctColors = getDistinctColors(data.length, 'multicolor');
  
  return {
    ...chartTheme,
    title: {
      text: title,
      textStyle: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: 'bold'
      },
      left: 'center',
      top: '2%'
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: '#4B5563',
          width: 1
        }
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        formatter: (value) => format(new Date(value), 'HH:mm:ss')
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#374151',
          type: 'dashed',
          width: 1
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#4B5563'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#4B5563',
          width: 1
        }
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        formatter: (value) => {
          if (title.includes('Usage') || title.includes('Percentage')) {
            return `${value}%`;
          }
          return value;
        }
      },
      splitLine: {
        lineStyle: {
          color: '#374151',
          type: 'dashed',
          width: 1
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#4B5563'
        }
      }
    },
    series: data.map((series, index) => ({
      name: series.name,
      type: 'line',
      data: series.data,
      smooth: 0.3, // Enhanced smoothness
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false, // Only show on hover
      lineStyle: {
        width: 3,
        color: distinctColors[index % distinctColors.length],
        cap: 'round',
        join: 'round',
        shadowColor: distinctColors[index % distinctColors.length] + '30',
        shadowBlur: 8,
        shadowOffsetY: 2
      },
      itemStyle: {
        color: distinctColors[index % distinctColors.length],
        borderWidth: 2,
        borderColor: '#1F2937',
        shadowColor: distinctColors[index % distinctColors.length] + '40',
        shadowBlur: 6
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 4,
          shadowBlur: 12,
          shadowColor: distinctColors[index % distinctColors.length] + '60'
        },
        itemStyle: {
          color: distinctColors[index % distinctColors.length],
          borderWidth: 3,
          borderColor: '#F1F5F9',
          shadowBlur: 10,
          shadowColor: distinctColors[index % distinctColors.length] + '80'
        }
      },
      areaStyle: isAreaChart ? {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: distinctColors[index % distinctColors.length] + '40'
            },
            {
              offset: 0.5,
              color: distinctColors[index % distinctColors.length] + '20'
            },
            {
              offset: 1,
              color: distinctColors[index % distinctColors.length] + '05'
            }
          ]
        },
        shadowColor: distinctColors[index % distinctColors.length] + '20',
        shadowBlur: 5
      } : undefined,
      // Enhanced animations with staggered entrance
      animationDelay: index * 150,
      animationDuration: 1500,
      animationEasing: 'elasticOut',
      animationDurationUpdate: 800,
      animationEasingUpdate: 'cubicInOut'
    })),
    animation: true,
    animationThreshold: 3000,
    animationDuration: 1500,
    animationEasing: 'elasticOut',
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicInOut',
    // Enhanced interaction
    brush: {
      xAxisIndex: 'all',
      brushLink: 'all',
      outOfBrush: {
        colorAlpha: 0.1
      }
    }
  };
};

// Generate gauge chart configuration
export const generateGaugeChartConfig = (value, title, maxValue = 100, color) => {
  return {
    ...chartTheme,
    title: {
      text: title,
      textStyle: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: 'bold'
      },
      left: 'center',
      top: '5%'
    },
    series: [
      {
        name: title,
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '80%',
        min: 0,
        max: maxValue,
        progress: {
          show: true,
          width: 15,
          itemStyle: {
            color: color[0]
          }
        },
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [0.6, color[0]],
              [0.8, '#F59E0B'],
              [1, '#EF4444']
            ]
          }
        },
        axisTick: {
          distance: -25,
          length: 8,
          lineStyle: {
            color: '#6B7280',
            width: 1
          }
        },
        splitLine: {
          distance: -30,
          length: 15,
          lineStyle: {
            color: '#6B7280',
            width: 2
          }
        },
        axisLabel: {
          color: '#9CA3AF',
          distance: -35,
          fontSize: 10
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: '#F9FAFB',
          fontSize: 20,
          fontWeight: 'bold',
          offsetCenter: [0, '80%']
        },
        data: [
          {
            value: value,
            name: title
          }
        ],
        animation: true,
        animationDuration: 2000,
        animationEasing: 'elasticOut'
      }
    ]
  };
};

// Generate bar chart configuration
export const generateBarChartConfig = (data, title, colors) => {
  return {
    ...chartTheme,
    title: {
      text: title,
      textStyle: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: 'bold'
      },
      left: 'center',
      top: '2%'
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLine: {
        lineStyle: {
          color: '#4B5563'
        }
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        rotate: data.categories.some(cat => cat.length > 8) ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#4B5563'
        }
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: '#374151',
          type: 'dashed'
        }
      }
    },
    series: data.series.map((series, index) => ({
      name: series.name,
      type: 'bar',
      data: series.data,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: colors[index % colors.length]
            },
            {
              offset: 1,
              color: colors[index % colors.length] + '80'
            }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: colors[index % colors.length]
        }
      },
      animationDelay: (idx) => idx * 50,
      animationDuration: 1000
    })),
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };
};

// WebGL optimization settings
export const webglConfig = {
  animation: true,
  animationThreshold: 2000,
  progressive: 1000,
  progressiveThreshold: 3000,
  hoverLayerThreshold: 3000,
  useCoarsePointer: true,
  useDirtyRect: true
};

// Time series data formatter
export const formatTimeSeriesData = (historicalData, metricKey) => {
  if (!historicalData || !Array.isArray(historicalData)) {
    console.warn('📊 formatTimeSeriesData: Invalid historicalData', { historicalData, metricKey });
    return [];
  }

  if (historicalData.length === 0) {
    console.warn('📊 formatTimeSeriesData: Empty historicalData array', { metricKey });
    return [];
  }

  const formattedData = historicalData
    .filter(point => point && point.timestamp) // Filter out invalid points
    .map(point => {
      const timestamp = new Date(point.timestamp).getTime();
      const value = point[metricKey] !== undefined ? point[metricKey] : (point.value || 0);
      
      // Ensure valid numeric values
      const numericValue = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
      
      return [timestamp, numericValue];
    })
    .sort((a, b) => a[0] - b[0]); // Sort by timestamp

  console.log(`📊 formatTimeSeriesData for ${metricKey}:`, {
    input: historicalData.length,
    output: formattedData.length,
    sample: formattedData.slice(-3) // Show last 3 points
  });

  return formattedData;
};

// Multi-metric time series formatter
export const formatMultiMetricData = (historicalData, metrics) => {
  return metrics.map(metric => ({
    name: metric.name,
    data: formatTimeSeriesData(historicalData, metric.key)
  }));
};

// Export all configurations
export default {
  chartTheme,
  colorPalette,
  chartTypes,
  generateLineChartConfig,
  generateGaugeChartConfig,
  generateBarChartConfig,
  webglConfig,
  formatTimeSeriesData,
  formatMultiMetricData
};

