import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

function MetricsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <ChartBarIcon className="h-8 w-8 text-primary-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Metrics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View performance metrics and resource utilization
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">
          Metrics dashboard and charts will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default MetricsPage;