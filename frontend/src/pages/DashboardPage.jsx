import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'primary' }) => {
  const colorClasses = {
    primary: 'text-primary-500 bg-primary-500/10 border-primary-500/20',
    success: 'text-success-500 bg-success-500/10 border-success-500/20',
    warning: 'text-warning-500 bg-warning-500/10 border-warning-500/20',
    error: 'text-error-500 bg-error-500/10 border-error-500/20'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-secondary-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-secondary-100 mt-1">{value}</p>
          {subtitle && <p className="text-secondary-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

const ActivityItem = ({ action, resource, time, user }) => (
  <div className="flex items-center justify-between py-3 border-b border-secondary-700/30 last:border-b-0">
    <div className="flex items-center space-x-3">
      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
      <div>
        <p className="text-secondary-200 text-sm">
          <span className="font-medium">{user}</span> {action} {resource}
        </p>
        <p className="text-secondary-500 text-xs">{time}</p>
      </div>
    </div>
    <Activity className="w-4 h-4 text-secondary-400" />
  </div>
);

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboardData({
        clusters: { total: 1, healthy: 1 },
        nodes: { total: 3, ready: 3, notReady: 0 },
        pods: { total: 24, running: 22, pending: 1, failed: 1 },
        services: { total: 12, active: 12 },
        deployments: { total: 8, ready: 7, updating: 1 },
        recentActivity: [
          { action: 'scaled', resource: 'deployment/nginx', time: '2 minutes ago', user: user?.fullName || 'System' },
          { action: 'created', resource: 'pod/app-worker', time: '5 minutes ago', user: user?.fullName || 'System' },
          { action: 'deleted', resource: 'service/old-api', time: '10 minutes ago', user: user?.fullName || 'System' },
          { action: 'updated', resource: 'configmap/app-config', time: '15 minutes ago', user: user?.fullName || 'System' },
        ]
      });
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-error-500 mb-2">Error Loading Dashboard</h3>
          <p className="text-secondary-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-secondary-400 mt-1">
            Kubernetes cluster overview and monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-secondary-400">Cluster Connected</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Server}
          title="Nodes"
          value={`${dashboardData.nodes.ready}/${dashboardData.nodes.total}`}
          subtitle="Ready nodes"
          color="success"
        />
        <StatCard
          icon={Database}
          title="Pods"
          value={dashboardData.pods.running}
          subtitle={`${dashboardData.pods.total} total`}
          color="primary"
        />
        <StatCard
          icon={Activity}
          title="Services"
          value={dashboardData.services.active}
          subtitle="Active services"
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          title="Deployments"
          value={`${dashboardData.deployments.ready}/${dashboardData.deployments.total}`}
          subtitle="Ready deployments"
          color={dashboardData.deployments.updating > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cluster Status */}
        <div className="lg:col-span-2">
          <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-secondary-100 mb-4 flex items-center">
              <Server className="w-5 h-5 mr-2 text-primary-500" />
              Cluster Status
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Pods Running</span>
                  <span className="text-success-500 font-medium">{dashboardData.pods.running}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Pods Pending</span>
                  <span className="text-warning-500 font-medium">{dashboardData.pods.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Pods Failed</span>
                  <span className="text-error-500 font-medium">{dashboardData.pods.failed}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Services</span>
                  <span className="text-primary-500 font-medium">{dashboardData.services.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Deployments</span>
                  <span className="text-primary-500 font-medium">{dashboardData.deployments.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Nodes Ready</span>
                  <span className="text-success-500 font-medium">{dashboardData.nodes.ready}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-secondary-100 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary-500" />
              Recent Activity
            </h2>
            
            <div className="space-y-1">
              {dashboardData.recentActivity.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </div>
            
            <button className="w-full mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
              View All Activities →
            </button>
          </div>
        </div>
      </div>

      {/* User Role Banner */}
      <div className="bg-gradient-to-r from-primary-600/20 to-accent-600/20 border border-primary-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-secondary-200 font-medium">
                Welcome, {user?.fullName || user?.username}!
              </p>
              <p className="text-secondary-400 text-sm">
                Access Level: <span className="capitalize text-primary-400">{user?.role}</span>
              </p>
            </div>
          </div>
          <CheckCircle className="w-6 h-6 text-success-500" />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;