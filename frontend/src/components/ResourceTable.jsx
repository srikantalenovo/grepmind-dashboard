import React, { useState, useMemo } from 'react';

const ResourceTable = ({ resources, resourceType, onResourceSelect, getStatusBadge }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredAndSortedResources = useMemo(() => {
    let filtered = resources.filter(resource =>
      resource.name.toLowerCase().includes(search.toLowerCase()) ||
      (resource.namespace && resource.namespace.toLowerCase().includes(search.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [resources, search, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatAge = (timestamp) => {
    if (!timestamp) return '-';
    const age = new Date() - new Date(timestamp);
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    const hours = Math.floor((age % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getColumns = () => {
    const baseColumns = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'namespace', label: 'Namespace', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'age', label: 'Age', sortable: true }
    ];

    switch (resourceType) {
      case 'pods':
        return [
          ...baseColumns,
          { key: 'ready', label: 'Ready', sortable: false },
          { key: 'restarts', label: 'Restarts', sortable: true },
          { key: 'ip', label: 'IP', sortable: false },
          { key: 'node', label: 'Node', sortable: true }
        ];
      case 'services':
        return [
          ...baseColumns,
          { key: 'type', label: 'Type', sortable: true },
          { key: 'clusterIP', label: 'Cluster IP', sortable: false },
          { key: 'externalIP', label: 'External IP', sortable: false },
          { key: 'ports', label: 'Ports', sortable: false }
        ];
      case 'deployments':
        return [
          ...baseColumns,
          { key: 'ready', label: 'Ready', sortable: false },
          { key: 'upToDate', label: 'Up-to-date', sortable: true },
          { key: 'available', label: 'Available', sortable: true },
          { key: 'strategy', label: 'Strategy', sortable: true }
        ];
      default:
        return baseColumns;
    }
  };

  const renderCellValue = (resource, column) => {
    const value = resource[column.key];
    
    switch (column.key) {
      case 'status':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatusBadge(value)
          }`}>
            {value}
          </span>
        );
      case 'age':
        return formatAge(value);
      case 'ports':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value || '-';
      case 'ready':
        if (resourceType === 'deployments') {
          const [ready, total] = (value || '0/0').split('/');
          const isReady = ready === total && parseInt(total) > 0;
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              isReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {value}
            </span>
          );
        }
        return value || '-';
      case 'restarts':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            parseInt(value) > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>
            {value}
          </span>
        );
      default:
        return value || '-';
    }
  };

  const columns = getColumns();

  if (!resources || resources.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          📁
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No {resourceType} found</h3>
        <p className="mt-1 text-sm text-gray-500">
          No {resourceType} resources found in the selected namespace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAndSortedResources.length} of {resources.length} {resourceType}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <svg
                        className={`h-4 w-4 ${
                          sortField === column.key
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        } ${
                          sortField === column.key && sortDirection === 'desc'
                            ? 'transform rotate-180'
                            : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedResources.map((resource, index) => (
              <tr
                key={resource.name || index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onResourceSelect(resource)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {renderCellValue(resource, column)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResourceSelect(resource);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceTable;
