import React from 'react';
import { CircleStackIcon } from '@heroicons/react/24/outline';

function PodsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <CircleStackIcon className="h-8 w-8 text-primary-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pods
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage Kubernetes pods across all clusters
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">
          Pod management and monitoring functionality will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default PodsPage;