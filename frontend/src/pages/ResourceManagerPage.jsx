import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileEdit, 
  Copy, 
  Trash2, 
  Search, 
  Plus,
  Code,
  LayoutTemplate,
  Archive,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const ResourceManagerPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);

  const tabs = [
    { id: 'editor', label: 'Editor', icon: Code, description: 'YAML/JSON resource editor' },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, description: 'Pre-built resource templates' },
    { id: 'clone', label: 'Clone', icon: Copy, description: 'Clone resources across namespaces' },
    { id: 'bulk', label: 'Bulk Operations', icon: Archive, description: 'Multi-resource operations' },
    { id: 'search', label: 'Resource Search', icon: Search, description: 'Advanced search and filtering' }
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
          <h1 className="text-3xl font-bold gradient-text">Resource Manager</h1>
          <p className="text-secondary-400 mt-1">Advanced Kubernetes resource management and operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
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
            {activeTab === 'editor' && <EditorTab />}
            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'clone' && <CloneTab />}
            {activeTab === 'bulk' && <BulkOperationsTab />}
            {activeTab === 'search' && <ResourceSearchTab />}
          </>
        )}
      </div>
    </motion.div>
  );
};

// Editor Tab Component
const EditorTab = () => {
  const [selectedResource, setSelectedResource] = useState('pod');
  const [yamlContent, setYamlContent] = useState(`apiVersion: v1
kind: Pod
metadata:
  name: example-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">YAML/JSON Resource Editor</h3>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedResource} 
            onChange={(e) => setSelectedResource(e.target.value)}
            className="input-field"
          >
            <option value="pod">Pod</option>
            <option value="deployment">Deployment</option>
            <option value="service">Service</option>
            <option value="configmap">ConfigMap</option>
            <option value="secret">Secret</option>
          </select>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Apply Resource
          </button>
        </div>
      </div>
      
      <div className="bg-secondary-900 rounded-lg border border-secondary-700/50 overflow-hidden">
        <div className="bg-secondary-800/50 px-4 py-2 border-b border-secondary-700/50">
          <span className="text-sm font-medium text-secondary-300">YAML Editor</span>
        </div>
        <textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          className="w-full h-96 p-4 bg-transparent text-secondary-200 font-mono text-sm resize-none focus:outline-none"
          placeholder="Enter your YAML configuration..."
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-secondary-400">
          <div className="w-2 h-2 bg-success-500 rounded-full"></div>
          <span>Valid YAML syntax</span>
        </div>
        <div className="flex space-x-2">
          <button className="btn btn-ghost">Validate</button>
          <button className="btn btn-ghost">Preview</button>
          <button className="btn btn-success">Apply</button>
        </div>
      </div>
    </div>
  );
};

// Templates Tab Component  
const TemplatesTab = () => {
  const templates = [
    { name: 'NGINX Deployment', type: 'Deployment', description: 'Basic NGINX web server deployment' },
    { name: 'Redis StatefulSet', type: 'StatefulSet', description: 'Redis database with persistent storage' },
    { name: 'Load Balancer Service', type: 'Service', description: 'External load balancer service' },
    { name: 'Horizontal Pod Autoscaler', type: 'HPA', description: 'Auto-scaling configuration' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Resource Templates</h3>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <div key={index} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4 hover:bg-secondary-700/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-secondary-100">{template.name}</h4>
                <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded mt-1 inline-block">
                  {template.type}
                </span>
              </div>
              <LayoutTemplate className="w-5 h-5 text-secondary-400" />
            </div>
            <p className="text-sm text-secondary-400 mb-4">{template.description}</p>
            <div className="flex space-x-2">
              <button className="btn btn-sm btn-primary flex-1">Use Template</button>
              <button className="btn btn-sm btn-ghost">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Clone Tab Component
const CloneTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Clone Resources</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Resource cloning functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

// Bulk Operations Tab Component
const BulkOperationsTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Bulk Operations</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Bulk operations functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

// Resource Search Tab Component
const ResourceSearchTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Advanced Resource Search</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Advanced search functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

export default ResourceManagerPage;
