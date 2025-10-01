import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage system alerts and notifications
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">
          Alert management and notification settings will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default AlertsPage;