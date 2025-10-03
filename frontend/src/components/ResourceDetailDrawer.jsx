import React, { useState, useEffect } from 'react';
import { resourcesApi } from '../services/api';
import LoadingSpinner from './ui/LoadingSpinner';

const ResourceDetailDrawer = ({ isOpen, onClose, resource, resourceType, namespace }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [resourceDetails, setResourceDetails] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'yaml', name: 'YAML', icon: '📜' },
    ...(resourceType === 'pods' ? [{ id: 'logs', name: 'Logs', icon: '📄' }] : [])
  ];

  useEffect(() => {
    if (isOpen && resource) {
      fetchResourceDetails();
      if (activeTab === 'logs' && resourceType === 'pods') {
        fetchLogs();
      }
    }
  }, [isOpen, resource, activeTab]);

  const fetchResourceDetails = async () => {
    if (!resource || !resource.name) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await resourcesApi.getResourceDetails(
        resourceType.slice(0, -1), // Remove 's' from plural
        resource.name,
        namespace
      );
      setResourceDetails(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch resource details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!resource || !resource.name || resourceType !== 'pods') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await resourcesApi.getPodLogs(
        resource.name,
        namespace,
        { lines: 100 }
      );
      setLogs(data.logs || 'No logs available');
    } catch (err) {
      setError(err.message || 'Failed to fetch logs');
      setLogs('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!resource) return null;

    const basicInfo = [
      { label: 'Name', value: resource.name },
      { label: 'Namespace', value: resource.namespace },
      { label: 'Status', value: resource.status },
      { label: 'Created', value: new Date(resource.age).toLocaleString() }
    ];

    // Add resource-specific info
    switch (resourceType) {
      case 'pods':
        basicInfo.push(
          { label: 'Ready', value: resource.ready },
          { label: 'Restarts', value: resource.restarts },
          { label: 'Pod IP', value: resource.ip },
          { label: 'Node', value: resource.node }
        );
        break;
      case 'services':
        basicInfo.push(
          { label: 'Type', value: resource.type },
          { label: 'Cluster IP', value: resource.clusterIP },
          { label: 'External IP', value: resource.externalIP },
          { label: 'Ports', value: Array.isArray(resource.ports) ? resource.ports.join(', ') : resource.ports }
        );
        break;
      case 'deployments':
        basicInfo.push(
          { label: 'Ready', value: resource.ready },
          { label: 'Up-to-date', value: resource.upToDate },
          { label: 'Available', value: resource.available },
          { label: 'Strategy', value: resource.strategy }
        );
        break;
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            {basicInfo.map((item) => (
              <div key={item.label}>
                <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{item.value || '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
        
        {resource.labels && Object.keys(resource.labels).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(resource.labels).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {resource.annotations && Object.keys(resource.annotations).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Annotations</h3>
            <div className="bg-gray-50 rounded-md p-4">
              <dl className="space-y-2">
                {Object.entries(resource.annotations).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-medium text-gray-500 break-all">{key}</dt>
                    <dd className="text-xs text-gray-900 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderYaml = () => {
    if (!resourceDetails || !resourceDetails.yaml) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">YAML content not available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">YAML Manifest</h3>
          <button
            onClick={() => navigator.clipboard.writeText(resourceDetails.yaml)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            📋 Copy YAML
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96">
          <code>{resourceDetails.yaml}</code>
        </pre>
      </div>
    );
  };

  const renderLogs = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Pod Logs</h3>
          <div className="flex space-x-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(logs)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📋 Copy Logs
            </button>
          </div>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96 whitespace-pre-wrap">
          <code>{logs}</code>
        </pre>
      </div>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">❌ Error</div>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => {
              if (activeTab === 'logs') {
                fetchLogs();
              } else {
                fetchResourceDetails();
              }
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'yaml':
        return renderYaml();
      case 'logs':
        return renderLogs();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex z-50">
        <div className="w-screen max-w-2xl">
          <div className="h-full flex flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-4 py-6 bg-gray-50 sm:px-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {resource?.name || 'Resource Details'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {resourceType.slice(0, -1)} in {namespace}
                  </p>
                </div>
                <div className="ml-3 h-7 flex items-center">
                  <button
                    onClick={onClose}
                    className="bg-gray-50 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">Close panel</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm mr-6 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.name}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResourceDetailDrawer;
