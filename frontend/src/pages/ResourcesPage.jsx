import React, { useState, useEffect } from 'react';
import { resourcesApi } from '../services/api';
import ResourceTable from '../components/ResourceTable';
import NamespaceSelector from '../components/NamespaceSelector';
import ClusterSelector from '../components/ClusterSelector';
import ResourceDetailDrawer from '../components/ResourceDetailDrawer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuthStore } from '../stores/authStore';

const ResourcesPage = () => {
  const { user } = useAuthStore();
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [selectedResource, setSelectedResource] = useState('pods');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const resourceTypes = [
    { value: 'pods', label: 'Pods', icon: '🔄' },
    { value: 'deployments', label: 'Deployments', icon: '📦' },
    { value: 'services', label: 'Services', icon: '🌐' },
    { value: 'statefulsets', label: 'StatefulSets', icon: '📊' },
    { value: 'daemonsets', label: 'DaemonSets', icon: '🔧' },
    { value: 'jobs', label: 'Jobs', icon: '⚙️' },
    { value: 'cronjobs', label: 'CronJobs', icon: '⏰' },
    { value: 'configmaps', label: 'ConfigMaps', icon: '⚙️' },
    { value: 'secrets', label: 'Secrets', icon: '🔐' },
    { value: 'persistentvolumeclaims', label: 'PersistentVolumeClaims', icon: '💾' },
    { value: 'ingress', label: 'Ingress', icon: '🌍' },
    { value: 'helm-releases', label: 'Helm Releases', icon: '⚙️' },
    { value: 'sparkapplications', label: 'SparkApplications', icon: '⚡' }
  ];

  const fetchResources = async () => {
    if (!selectedNamespace || !selectedResource) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data;
      switch (selectedResource) {
        case 'pods':
          data = await resourcesApi.getPods(selectedNamespace);
          break;
        case 'deployments':
          data = await resourcesApi.getDeployments(selectedNamespace);
          break;
        case 'services':
          data = await resourcesApi.getServices(selectedNamespace);
          break;
        case 'statefulsets':
          data = await resourcesApi.getStatefulSets(selectedNamespace);
          break;
        case 'daemonsets':
          data = await resourcesApi.getDaemonSets(selectedNamespace);
          break;
        case 'jobs':
          data = await resourcesApi.getJobs(selectedNamespace);
          break;
        case 'cronjobs':
          data = await resourcesApi.getCronJobs(selectedNamespace);
          break;
        case 'configmaps':
          data = await resourcesApi.getConfigMaps(selectedNamespace);
          break;
        case 'secrets':
          data = await resourcesApi.getSecrets(selectedNamespace);
          break;
        case 'persistentvolumeclaims':
          data = await resourcesApi.getPersistentVolumeClaims(selectedNamespace);
          break;
        case 'ingress':
          data = await resourcesApi.getIngress(selectedNamespace);
          break;
        case 'helm-releases':
          data = await resourcesApi.getHelmReleases(selectedNamespace);
          break;
        case 'sparkapplications':
          data = await resourcesApi.getSparkApplications(selectedNamespace);
          break;
        default:
          data = await resourcesApi.getPods(selectedNamespace);
      }
      setResources(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedNamespace, selectedResource]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchResources, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, selectedNamespace, selectedResource]);

  const handleResourceSelect = (item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Running: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Failed: 'bg-red-100 text-red-800',
      Succeeded: 'bg-blue-100 text-blue-800',
      Unknown: 'bg-gray-100 text-gray-800'
    };
    
    return badges[status] || badges.Unknown;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-500">Please log in to view resources.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🎯 Kubernetes Resources
          </h1>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Namespace Selector */}
            <NamespaceSelector
              value={selectedNamespace}
              onChange={setSelectedNamespace}
            />
            
            {/* Resource Type Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Resource Type:
              </label>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                style={{
                  backgroundColor: 'white',
                  color: '#111827'
                }}
              >
                {resourceTypes.map((type) => (
                  <option 
                    key={type.value} 
                    value={type.value}
                    className="bg-white text-gray-900 hover:bg-gray-50"
                    style={{
                      backgroundColor: 'white',
                      color: '#111827'
                    }}
                  >
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Auto Refresh Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Auto Refresh:
              </label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={fetchResources}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                '🔄 Refresh'
              )}
            </button>
          </div>
          
          {/* Last Updated */}
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading resources
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {loading && !resources.length ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <ResourceTable
              resources={resources}
              resourceType={selectedResource}
              onResourceSelect={handleResourceSelect}
              getStatusBadge={getStatusBadge}
            />
          )}
        </div>
      </div>

      {/* Resource Detail Drawer */}
      <ResourceDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        resource={selectedItem}
        resourceType={selectedResource}
        namespace={selectedNamespace}
      />
    </div>
  );
};

export default ResourcesPage;

