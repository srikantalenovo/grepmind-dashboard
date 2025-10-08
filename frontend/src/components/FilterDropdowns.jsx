import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Filter, 
  Server, 
  Box, 
  Layers, 
  ChevronDown,
  RefreshCw 
} from 'lucide-react';
import { monitoringAPI } from '../services/api';

const FilterDropdowns = ({ onFilterChange, className = '' }) => {
  // Dropdown states
  const [selectedCluster, setSelectedCluster] = useState('default');
  const [selectedResourceType, setSelectedResourceType] = useState('nodes'); // 'nodes' or 'pods'
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [selectedPod, setSelectedPod] = useState('all');
  
  // Data states
  const [clusters, setClusters] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadClusters();
  }, []);

  // Load namespaces when cluster or resource type changes
  useEffect(() => {
    if (selectedResourceType === 'pods') {
      loadNamespaces();
    } else {
      setSelectedNamespace('all');
      setSelectedPod('all');
      setNamespaces([{ id: 'all', name: 'All Namespaces' }]);
    }
  }, [selectedCluster, selectedResourceType]);

  // Load pods when namespace changes (with proper dependency)
  useEffect(() => {
    if (selectedResourceType === 'pods') {
      loadPods(); // Load pods for any namespace selection (including 'all')
    } else {
      setSelectedPod('all');
      setPods([{ id: 'all', name: 'All Pods' }]);
    }
  }, [selectedNamespace, selectedResourceType]);

  // Notify parent component when filters change
  useEffect(() => {
    const filters = {
      cluster: selectedCluster,
      resourceType: selectedResourceType,
      namespace: selectedResourceType === 'pods' ? selectedNamespace : null,
      pod: selectedResourceType === 'pods' && selectedPod !== 'all' ? selectedPod : null
    };
    onFilterChange(filters);
  }, [selectedCluster, selectedResourceType, selectedNamespace, selectedPod, onFilterChange]);

  const loadClusters = async () => {
    try {
      setLoading(true);
      // For now, we'll use a default cluster - can be extended for multi-cluster
      setClusters([
        { id: 'default', name: 'Default Cluster', status: 'healthy' }
      ]);
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNamespaces = async () => {
    try {
      setLoading(true);
      const response = await monitoringAPI.getNamespaces();
      const namespaceList = response.data || response || [];
      setNamespaces([
        { id: 'all', name: 'All Namespaces' },
        ...namespaceList.map(ns => ({ 
          id: ns.name || ns.id || ns, 
          name: ns.name || ns.id || ns 
        }))
      ]);
    } catch (error) {
      console.error('Error loading namespaces:', error);
      setNamespaces([{ id: 'all', name: 'All Namespaces' }]);
    } finally {
      setLoading(false);
    }
  };

  const loadPods = async () => {
    try {
      setLoading(true);
      // For "all" namespaces, get pods from default namespace or handle differently
      const targetNamespace = selectedNamespace === 'all' ? 'default' : selectedNamespace;
      const response = await monitoringAPI.getPods(targetNamespace);
      const podList = response.data || response || [];
      setPods([
        { id: 'all', name: 'All Pods' },
        ...podList.map(pod => ({ 
          id: pod.name || pod.id, 
          name: pod.name || pod.id, 
          status: pod.status || 'Unknown' 
        }))
      ]);
    } catch (error) {
      console.error('Error loading pods:', error);
      setPods([{ id: 'all', name: 'All Pods' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceTypeChange = (type) => {
    setSelectedResourceType(type);
    // Reset dependent selections
    if (type === 'nodes') {
      setSelectedNamespace('all');
      setSelectedPod('all');
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // Refresh current data based on selected filters
      if (selectedResourceType === 'pods') {
        await loadNamespaces();
        await loadPods(); // Always reload pods when in pods mode
      }
      
      // Also reload clusters if needed
      await loadClusters();
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Don't show error toast for auth errors, let the parent handle it
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className={`bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-medium text-secondary-100">Resource Filtering</h3>
        </div>
        <button 
          onClick={handleRefresh}
          className="btn btn-secondary btn-sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Cluster Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-secondary-300">
            <Server className="w-4 h-4 inline mr-1" />
            Cluster
          </label>
          <div className="relative">
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="w-full bg-secondary-700/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8"
            >
              {clusters.map(cluster => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-secondary-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Resource Type Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-secondary-300">
            <Box className="w-4 h-4 inline mr-1" />
            Resource Type
          </label>
          <div className="relative">
            <select
              value={selectedResourceType}
              onChange={(e) => handleResourceTypeChange(e.target.value)}
              className="w-full bg-secondary-700/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8"
            >
              <option value="nodes">Nodes</option>
              <option value="pods">Pods</option>
            </select>
            <ChevronDown className="w-4 h-4 text-secondary-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Namespace Selector - Only show for pods */}
        {selectedResourceType === 'pods' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary-300">
              <Layers className="w-4 h-4 inline mr-1" />
              Namespace
            </label>
            <div className="relative">
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="w-full bg-secondary-700/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8"
                disabled={loading}
              >
                {namespaces.map(ns => (
                  <option key={ns.id} value={ns.id}>
                    {ns.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-secondary-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Pod Selector - Show for pods resource type */}
        {selectedResourceType === 'pods' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary-300">
              <Box className="w-4 h-4 inline mr-1" />
              Pod
            </label>
            <div className="relative">
              <select
                value={selectedPod}
                onChange={(e) => setSelectedPod(e.target.value)}
                className="w-full bg-secondary-700/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8"
                disabled={loading}
              >
                {pods.map(pod => (
                  <option key={pod.id} value={pod.id}>
                    {pod.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-secondary-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Active Filter Summary */}
        <div className="md:col-span-2 lg:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-secondary-300">Active Filter</label>
          <div className="bg-secondary-700/30 rounded-md px-3 py-2 text-sm">
            <div className="text-secondary-200">
              <span className="text-primary-400">{selectedCluster}</span>
              {' / '}
              <span className="text-success-400">
                {selectedResourceType === 'nodes' ? 'All Nodes' : 
                 selectedNamespace === 'all' ? 'All Pods' :
                 selectedPod === 'all' ? `${selectedNamespace} (All Pods)` :
                 `${selectedNamespace} / ${selectedPod}`}
              </span>
            </div>
            <div className="text-xs text-secondary-400 mt-1">
              Viewing {selectedResourceType} metrics
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-3 flex items-center justify-center text-secondary-400">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          Loading filter options...
        </div>
      )}
    </motion.div>
  );
};

export default FilterDropdowns;
