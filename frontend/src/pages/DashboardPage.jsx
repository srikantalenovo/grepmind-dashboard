import React from 'react';
import { 
  CpuChipIcon, 
  ServerIcon, 
  CircleStackIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

function DashboardPage() {
  // Mock data for demonstration
  const stats = [
    { name: 'Total Clusters', value: '3', icon: ServerIcon, color: 'text-blue-600' },
    { name: 'Running Pods', value: '124', icon: CircleStackIcon, color: 'text-green-600' },
    { name: 'CPU Usage', value: '67%', icon: CpuChipIcon, color: 'text-yellow-600' },
    { name: 'Active Alerts', value: '2', icon: ExclamationTriangleIcon, color: 'text-red-600' },
  ];

  const clusterStatus = [
    { name: 'Production', status: 'healthy', nodes: 8, pods: 89 },
    { name: 'Staging', status: 'healthy', nodes: 4, pods: 23 },
    { name: 'Development', status: 'warning', nodes: 2, pods: 12 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor your Kubernetes clusters at a glance
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cluster Status */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Cluster Status
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Current status of all Kubernetes clusters
          </p>
          <div className="mt-6">
            <div className="space-y-4">
              {clusterStatus.map((cluster) => (
                <div
                  key={cluster.name}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {cluster.status === 'healthy' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {cluster.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cluster.nodes} nodes • {cluster.pods} pods
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      cluster.status === 'healthy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    }`}
                  >
                    {cluster.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              View Pods
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Check Metrics
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              View Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;