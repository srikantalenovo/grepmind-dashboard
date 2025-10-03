import React from 'react';

const ClusterSelector = ({ clusters, value, onChange }) => {
  if (!clusters || clusters.length <= 1) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Cluster:</label>
        <div className="px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-md">
          🎯 {value || 'Current Cluster'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700">Cluster:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {clusters.map((cluster) => (
          <option key={cluster.name} value={cluster.name}>
            🎯 {cluster.name}
            {cluster.status && (
              <span className={`ml-2 ${
                cluster.status === 'Connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                ({cluster.status})
              </span>
            )}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ClusterSelector;
