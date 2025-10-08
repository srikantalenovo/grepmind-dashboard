import React from 'react';
import { Clock, Calendar, TrendingUp } from 'lucide-react';

const TimeRangeSelector = ({ 
  selectedRange, 
  onRangeChange, 
  className = '', 
  showLabel = true,
  size = 'default' 
}) => {
  // Time range options with exact specifications requested
  const timeRanges = [
    {
      value: '15m',
      label: 'Last 15 min',
      description: 'Real-time monitoring',
      icon: TrendingUp,
      minutes: 15
    },
    {
      value: '1h', 
      label: 'Last 1 hr',
      description: 'Recent trends',
      icon: Clock,
      minutes: 60
    },
    {
      value: '1d',
      label: '1 day',
      description: 'Daily patterns',
      icon: Calendar,
      minutes: 1440
    },
    {
      value: '2d',
      label: '2 day',
      description: 'Extended view',
      icon: Calendar,
      minutes: 2880
    },
    {
      value: '7d',
      label: 'Last 7 days',
      description: 'Weekly analysis',
      icon: Calendar,
      minutes: 10080
    }
  ];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  // Calculate start and end times for the selected range
  const getTimeRange = (range) => {
    const now = new Date();
    const rangeInfo = timeRanges.find(r => r.value === range);
    if (!rangeInfo) return { start: null, end: null };

    const start = new Date(now.getTime() - (rangeInfo.minutes * 60 * 1000));
    return {
      start: start.toISOString(),
      end: now.toISOString(),
      minutes: rangeInfo.minutes
    };
  };

  const handleRangeChange = (newRange) => {
    const timeInfo = getTimeRange(newRange);
    onRangeChange(newRange, timeInfo);
  };

  const currentRange = timeRanges.find(r => r.value === selectedRange);
  const CurrentIcon = currentRange?.icon || Clock;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabel && (
        <div className="flex items-center space-x-2 text-secondary-400">
          <CurrentIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Time Range:</span>
        </div>
      )}
      
      <div className="relative">
        <select
          value={selectedRange}
          onChange={(e) => handleRangeChange(e.target.value)}
          className={`
            input-field appearance-none cursor-pointer
            ${sizeClasses[size]}
            bg-secondary-800/70 border-secondary-600/50 text-secondary-100
            hover:border-primary-500/50 focus:border-primary-500
            transition-all duration-200
            min-w-[140px]
          `}
        >
          {timeRanges.map((range) => (
            <option 
              key={range.value} 
              value={range.value}
              className="bg-secondary-800 text-secondary-100"
            >
              {range.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Quick info about selected range */}
      {currentRange && (
        <div className="hidden sm:flex items-center text-xs text-secondary-500">
          <span>•</span>
          <span className="ml-1">{currentRange.description}</span>
        </div>
      )}
    </div>
  );
};

export default TimeRangeSelector;

// Export time range utilities for use in other components
export const getTimeRangeInfo = (range) => {
  const timeRanges = {
    '15m': { minutes: 15, label: 'Last 15 minutes' },
    '1h': { minutes: 60, label: 'Last 1 hour' },
    '1d': { minutes: 1440, label: '1 day' },
    '2d': { minutes: 2880, label: '2 days' },
    '7d': { minutes: 10080, label: 'Last 7 days' }
  };

  const info = timeRanges[range];
  if (!info) return null;

  const now = new Date();
  const start = new Date(now.getTime() - (info.minutes * 60 * 1000));
  
  return {
    ...info,
    start: start.toISOString(),
    end: now.toISOString(),
    startTimestamp: start.getTime(),
    endTimestamp: now.getTime()
  };
};

// Utility function to format time for display
export const formatTimeRange = (range) => {
  const info = getTimeRangeInfo(range);
  if (!info) return '';
  
  const start = new Date(info.start);
  const end = new Date(info.end);
  
  if (info.minutes < 60) {
    return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
  } else if (info.minutes < 1440) {
    return `${start.toLocaleString()} - ${end.toLocaleString()}`;
  } else {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
};
