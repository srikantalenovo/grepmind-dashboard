import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Shield, 
  Scan,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileCheck,
  Users,
  Network,
  RefreshCw,
  Download,
  Eye,
  Key
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const SecurityPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('scan');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'scan', label: 'Security Scan', icon: Scan, description: 'Image and cluster vulnerability scanning' },
    { id: 'compliance', label: 'Compliance', icon: FileCheck, description: 'CIS benchmarks and policy validation' },
    { id: 'rbac', label: 'RBAC Audit', icon: Users, description: 'Role and permission analysis' },
    { id: 'network', label: 'Network Policies', icon: Network, description: 'Network security visualization' },
    { id: 'reports', label: 'Security Reports', icon: Shield, description: 'Compliance and security reporting' }
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
          <h1 className="text-3xl font-bold gradient-text">Security</h1>
          <p className="text-secondary-400 mt-1">Cluster security analysis and compliance monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
            <span className="text-secondary-400">Security Scan Running</span>
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

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SecurityStatCard 
          title="High Vulnerabilities" 
          value="7" 
          status="critical"
          icon={AlertTriangle}
        />
        <SecurityStatCard 
          title="Medium Vulnerabilities" 
          value="23" 
          status="warning"
          icon={XCircle}
        />
        <SecurityStatCard 
          title="Compliant Resources" 
          value="156" 
          status="success"
          icon={CheckCircle}
        />
        <SecurityStatCard 
          title="Security Score" 
          value="78%" 
          status="info"
          icon={Shield}
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
            {activeTab === 'scan' && <SecurityScanTab />}
            {activeTab === 'compliance' && <ComplianceTab />}
            {activeTab === 'rbac' && <RbacAuditTab />}
            {activeTab === 'network' && <NetworkPoliciesTab />}
            {activeTab === 'reports' && <SecurityReportsTab />}
          </>
        )}
      </div>
    </motion.div>
  );
};

// Security Stat Card Component
const SecurityStatCard = ({ title, value, status, icon: Icon }) => {
  const statusClasses = {
    critical: 'text-error-400 bg-error-500/20 border-error-500/30',
    warning: 'text-warning-400 bg-warning-500/20 border-warning-500/30',
    success: 'text-success-400 bg-success-500/20 border-success-500/30',
    info: 'text-primary-400 bg-primary-500/20 border-primary-500/30'
  };

  return (
    <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-400">{title}</p>
          <p className="text-2xl font-bold text-secondary-100 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg border ${statusClasses[status]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Security Scan Tab Component
const SecurityScanTab = () => {
  const vulnerabilities = [
    { 
      image: 'nginx:1.19', 
      namespace: 'default', 
      pod: 'nginx-deployment-123',
      severity: 'High', 
      cve: 'CVE-2021-23017', 
      description: 'nginx resolver denial of service vulnerability',
      fixedIn: '1.20.1'
    },
    { 
      image: 'alpine:3.12', 
      namespace: 'production', 
      pod: 'api-backend-456',
      severity: 'Medium', 
      cve: 'CVE-2021-36159', 
      description: 'libfetch buffer overflow vulnerability',
      fixedIn: '3.13.6'
    },
    { 
      image: 'ubuntu:18.04', 
      namespace: 'staging', 
      pod: 'worker-789',
      severity: 'Low', 
      cve: 'CVE-2021-3711', 
      description: 'OpenSSL buffer overflow vulnerability',
      fixedIn: '20.04'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">Vulnerability Scanning</h3>
        <div className="flex items-center space-x-3">
          <select className="input-field">
            <option>All Namespaces</option>
            <option>default</option>
            <option>production</option>
            <option>staging</option>
          </select>
          <select className="input-field">
            <option>All Severities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button className="btn btn-primary">
            <Scan className="w-4 h-4 mr-2" />
            Start Scan
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {vulnerabilities.map((vuln, index) => (
          <div key={index} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    vuln.severity === 'High' 
                      ? 'bg-error-500/20 text-error-400'
                      : vuln.severity === 'Medium'
                      ? 'bg-warning-500/20 text-warning-400'
                      : 'bg-success-500/20 text-success-400'
                  }`}>
                    {vuln.severity}
                  </span>
                  <span className="text-sm font-mono text-secondary-300">{vuln.cve}</span>
                  <span className="text-xs px-2 py-1 bg-secondary-700 text-secondary-300 rounded">
                    {vuln.namespace}
                  </span>
                </div>
                <h4 className="font-medium text-secondary-100 mb-1">{vuln.description}</h4>
                <div className="text-sm text-secondary-400 space-y-1">
                  <p><span className="font-medium">Image:</span> {vuln.image}</p>
                  <p><span className="font-medium">Pod:</span> {vuln.pod}</p>
                  <p><span className="font-medium">Fixed in:</span> {vuln.fixedIn}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="btn btn-sm btn-ghost" title="View Details">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="btn btn-sm btn-primary" title="Fix">
                  Fix
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Compliance Tab Component
const ComplianceTab = () => {
  const complianceChecks = [
    { name: 'Pod Security Standards', status: 'passed', score: '95%', category: 'Pod Security' },
    { name: 'Network Policies', status: 'failed', score: '45%', category: 'Network Security' },
    { name: 'RBAC Configuration', status: 'warning', score: '78%', category: 'Access Control' },
    { name: 'Resource Limits', status: 'passed', score: '88%', category: 'Resource Management' },
    { name: 'Image Security', status: 'failed', score: '32%', category: 'Container Security' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">CIS Kubernetes Benchmark</h3>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="btn btn-primary">
            <Scan className="w-4 h-4 mr-2" />
            Run Check
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {complianceChecks.map((check, index) => (
            <div key={index} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-secondary-100">{check.name}</h4>
                <div className={`p-1 rounded ${
                  check.status === 'passed' 
                    ? 'bg-success-500/20 text-success-400'
                    : check.status === 'failed'
                    ? 'bg-error-500/20 text-error-400'
                    : 'bg-warning-500/20 text-warning-400'
                }`}>
                  {check.status === 'passed' ? <CheckCircle className="w-4 h-4" /> :
                   check.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                   <AlertTriangle className="w-4 h-4" />}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-1 bg-secondary-700 text-secondary-300 rounded">
                  {check.category}
                </span>
                <span className="text-sm font-medium text-secondary-200">{check.score}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
          <h4 className="font-medium text-secondary-100 mb-4">Compliance Overview</h4>
          <div className="h-64 flex items-center justify-center text-secondary-400">
            <div className="text-center">
              <FileCheck className="w-12 h-12 mx-auto mb-2" />
              <p>Compliance chart will be rendered here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// RBAC Audit Tab Component
const RbacAuditTab = () => {
  const rbacIssues = [
    { type: 'Excessive Permissions', user: 'system:node:worker-1', permission: 'cluster-admin', risk: 'High', recommendation: 'Reduce to specific permissions' },
    { type: 'Unused Role', role: 'old-developer-role', lastUsed: '30+ days', risk: 'Medium', recommendation: 'Remove unused role' },
    { type: 'Wide ClusterRole', role: 'monitoring-reader', resources: 'All namespaces', risk: 'Low', recommendation: 'Scope to specific namespaces' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-secondary-100">RBAC Security Analysis</h3>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Key className="w-4 h-4 mr-2" />
            View Permissions
          </button>
          <button className="btn btn-primary">
            <Scan className="w-4 h-4 mr-2" />
            Audit RBAC
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {rbacIssues.map((issue, index) => (
          <div key={index} className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    issue.risk === 'High' 
                      ? 'bg-error-500/20 text-error-400'
                      : issue.risk === 'Medium'
                      ? 'bg-warning-500/20 text-warning-400'
                      : 'bg-success-500/20 text-success-400'
                  }`}>
                    {issue.risk} Risk
                  </span>
                  <span className="text-sm font-medium text-secondary-200">{issue.type}</span>
                </div>
                <div className="text-sm text-secondary-400 space-y-1">
                  <p><span className="font-medium">Subject:</span> {issue.user || issue.role}</p>
                  <p><span className="font-medium">Issue:</span> {issue.permission || issue.lastUsed || issue.resources}</p>
                  <p><span className="font-medium">Recommendation:</span> {issue.recommendation}</p>
                </div>
              </div>
              <button className="btn btn-sm btn-primary">Fix</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Network Policies Tab Component
const NetworkPoliciesTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Network Security Policies</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Network policies visualization will be implemented here
        </p>
      </div>
    </div>
  );
};

// Security Reports Tab Component
const SecurityReportsTab = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-secondary-100">Security & Compliance Reports</h3>
      <div className="bg-secondary-800/50 rounded-lg border border-secondary-700/50 p-6">
        <p className="text-secondary-400 text-center py-8">
          Security reporting functionality will be implemented here
        </p>
      </div>
    </div>
  );
};

export default SecurityPage;