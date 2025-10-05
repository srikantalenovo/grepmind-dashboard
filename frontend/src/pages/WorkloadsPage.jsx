import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Layers, 
  Scale, 
  RotateCcw,
  Heart,
  RefreshCw,
  Play,
  Pause,
  Square,
  FileText,
  TrendingUp,
  GitBranch
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const WorkloadsPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('deployments');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'deployments', label: 'Deployments', icon: Package, description: 'Application lifecycle management' },
    { id: 'logs', label: 'Logs', icon: FileText, description: 'Aggregated logs with search and streaming' },
    { id: 'scaling', label: 'Scaling', icon: Scale, description: 'Manual and auto-scaling operations' },
    { id: 'rollouts', label: 'Rollouts', icon: GitBranch, description: 'Blue-green, canary deployments' },
    { id: 'health', label: 'Health Checks', icon: Heart, description: 'Readiness and liveness probes' }
  ];

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Workloads</h1>
          <p className="text-secondary-400 mt-1">Application lifecycle and workload management</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-secondary-400">Auto-refresh ON</span>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ActionCard 
          title="Deploy App" 
          description="Deploy new application" 
          icon={Play} 
          color="primary"
          action="deploy"
        />
        <ActionCard 
          title="Scale Workload" 
          description="Scale existing workloads" 
          icon={TrendingUp} 
          color="success"
          action="scale"
        />
        <ActionCard 
          title="Rollback" 
          description="Rollback deployment" 
          icon={RotateCcw} 
          color="warning"
          action="rollback"
        />
        <ActionCard 
          title="Health Check" 
          description="Configure health probes" 
          icon={Heart} 
          color="error"
          action="health"
        />
      </div>

      {/* Tab Navigation */}
      <div className="bg-secondary-800/50 backdrop-blur-sm rounded-xl border border-secondary-700/50 overflow-hidden">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 px-6 py-4 text-left transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-transparent text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <tab.icon className="w-5 h-5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs opacity-70 truncate">{tab.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-secondary-800/30 backdrop-blur-sm rounded-xl border border-secondary-700/50 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {activeTab === 'deployments' && <DeploymentsTab />}
            {activeTab === 'logs' && <LogsTab />}
            {activeTab === 'scaling' && <ScalingTab />}
            {activeTab === 'rollouts' && <RolloutsTab />}
            {activeTab === 'health' && <HealthChecksTab />}
          </>
        )}
      </div>
    </motion.div>
  );
};

// Action Card Component
const ActionCard = ({ title, description, icon: Icon, color, action }) => {
  const colorClasses = {
    primary: 'border-primary-500/30 hover:bg-primary-500/10',
    success: 'border-success-500/30 hover:bg-success-500/10',
    warning: 'border-warning-500/30 hover:bg-warning-500/10',
    error: 'border-error-500/30 hover:bg-error-500/10'
  };

  return (
    <button className={`bg-secondary-800/50 rounded-lg border ${colorClasses[color]} p-4 text-left transition-all duration-200 hover:border-opacity-50`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          color === 'primary' ? 'bg-primary-500/20 text-primary-400' :
          color === 'success' ? 'bg-success-500/20 text-success-400' :
          color === 'warning' ? 'bg-warning-500/20 text-warning-400' :
          'bg-error-500/20 text-error-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-medium text-secondary-100">{title}</h4>
          <p className="text-xs text-secondary-400">{description}</p>
        </div>
      </div>
    </button>
  );
};

// Deployments Tab Component
const DeploymentsTab = () => {
  const deployments = [
    { name: 'nginx-deployment', namespace: 'default', replicas: '3/3', status: 'Running', age: '2d', image: 'nginx:1.21' },
    { name: 'api-backend', namespace: 'production', replicas: '5/5', status: 'Running', age: '1w', image: 'api:v1.2.3' },
    { name: 'redis-cache', namespace: 'production', replicas: '1/1', status: 'Running', age: '3d', image: 'redis:6.2' },
    { name: 'frontend-app', namespace: 'staging', replicas: '2/3', status: 'Updating', age: '5d', image: 'frontend:v2.1.0' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Application Deployments</h3>
        <div className="flex items-center space-x-3">
          <select className="input-field">
            <option>All Namespaces</option>
            <option>default</option>
            <option>production</option>
            <option>staging</option>
          </select>
          <button className="btn btn-primary">
            <Play className="w-4 h-4 mr-2" />
            New Deployment
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-700/50">
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Namespace</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Ready</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Age</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Image</th>
              <th className="text-left py-3 px-4 text-secondary-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((deployment, index) => (
              <tr key={index} className="border-b border-secondary-700/30 hover:bg-secondary-700/30">
                <td className="py-3 px-4 text-secondary-100 font-medium">{deployment.name}</td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 bg-secondary-700 text-secondary-300 rounded">
                    {deployment.namespace}
                  </span>
                </td>
                <td className="py-3 px-4 text-secondary-200">{deployment.replicas}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    deployment.status === 'Running' 
                      ? 'bg-success-500/20 text-success-400' 
                      : 'bg-warning-500/20 text-warning-400'
                  }`}>
                    {deployment.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-secondary-300">{deployment.age}</td>
                <td className="py-3 px-4 text-secondary-300 font-mono text-sm">{deployment.image}</td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button className="btn btn-sm btn-ghost" title="Scale">
                      <Scale className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-ghost" title="Restart">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-ghost" title="Rollback">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Logs Tab Component
const LogsTab = () => {
  const [selectedPod, setSelectedPod] = useState('nginx-deployment-123');
  const [selectedContainer, setSelectedContainer] = useState('nginx');
  const [following, setFollowing] = useState(false);

  const logs = [
    '2024-10-04 17:15:32 INFO  Starting nginx server on port 80',
    '2024-10-04 17:15:33 INFO  Configuration loaded successfully',
    '2024-10-04 17:15:34 INFO  Server ready to accept connections',
    '2024-10-04 17:15:45 INFO  GET /health - 200 OK',
    '2024-10-04 17:16:12 INFO  GET /api/users - 200 OK',
    '2024-10-04 17:16:28 WARN  High memory usage detected: 85%',
    '2024-10-04 17:16:35 INFO  GET /api/metrics - 200 OK',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Container Logs</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedPod} 
            onChange={(e) => setSelectedPod(e.target.value)}
            className="input-field"
          >
            <option value="nginx-deployment-123">nginx-deployment-123</option>
            <option value="api-backend-456">api-backend-456</option>
            <option value="redis-cache-789">redis-cache-789</option>
          </select>
          <select 
            value={selectedContainer} 
            onChange={(e) => setSelectedContainer(e.target.value)}
            className="input-field"
          >
            <option value="nginx">nginx</option>
            <option value="sidecar">sidecar</option>
          </select>
          <button 
            onClick={() => setFollowing(!following)}
            className={`btn ${following ? 'btn-primary' : 'btn-secondary'}`}
          >
            {following ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {following ? 'Stop' : 'Follow'}
          </button>
        </div>
      </div>
      
      <div className="bg-secondary-900 rounded-lg border border-secondary-700/50 overflow-hidden">
        <div className="bg-secondary-800/50 px-4 py-2 border-b border-secondary-700/50 flex items-center justify-between">
          <span className="text-sm font-medium text-secondary-300">
            Logs: {selectedPod} / {selectedContainer}
          </span>
          <div className="flex items-center space-x-2 text-xs text-secondary-400">
            {following && <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>}
            <span>{following ? 'Live' : 'Static'}</span>
          </div>
        </div>
        <div className="h-96 overflow-y-auto p-4 font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="text-secondary-200 hover:bg-secondary-800/30 px-2 py-1 rounded">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Scaling Tab Component
const ScalingTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Scaling Operations</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Scaling operations functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

// Rollouts Tab Component
const RolloutsTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Deployment Rollouts</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Rollout strategies functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

// Health Checks Tab Component
const HealthChecksTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Health Checks & Probes</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Health checks configuration functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

export default WorkloadsPage;