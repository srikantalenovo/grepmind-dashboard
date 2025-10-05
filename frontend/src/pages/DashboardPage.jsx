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
  Users,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { dashboardAPI } from '../services/api';

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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎯 Fetching live dashboard data from cluster...');
      
      // dashboardAPI.getDashboardOverview() returns the data directly (apiRequest strips the wrapper)
      const dashboardData = await dashboardAPI.getDashboardOverview();
      
      // Validate we have data
      if (dashboardData && typeof dashboardData === 'object') {
        setDashboardData(dashboardData);
        setLastUpdated(new Date());
        console.log('✅ Successfully loaded live dashboard data', {
          nodes: dashboardData.nodes?.total,
          pods: dashboardData.pods?.total,
          services: dashboardData.services?.total,
          deployments: dashboardData.deployments?.total
        });
      } else {
        throw new Error('Invalid dashboard data received from server');
      }
    } catch (err) {
      console.error('❌ Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data from cluster');
      
      // If the main API fails, we could optionally set fallback data
      // but for now we'll show the error to make it clear when live data is unavailable
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
            Live Kubernetes cluster monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Refresh Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchDashboardData()}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-secondary-600 shadow-sm text-sm leading-4 font-medium rounded-md text-secondary-300 bg-secondary-700 hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <label className="flex items-center space-x-2 text-sm text-secondary-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-secondary-600 text-primary-500 focus:ring-primary-500 bg-secondary-700"
              />
              <span>Auto-refresh</span>
            </label>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-secondary-400">Live Cluster Data</span>
            {lastUpdated && (
              <span className="text-secondary-500 text-xs">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Server}
          title="Nodes"
          value={`${dashboardData?.nodes?.ready || 0}/${dashboardData?.nodes?.total || 0}`}
          subtitle="Ready nodes"
          color="success"
        />
        <StatCard
          icon={Database}
          title="Pods"
          value={dashboardData?.pods?.running || 0}
          subtitle={`${dashboardData?.pods?.total || 0} total`}
          color="primary"
        />
        <StatCard
          icon={Activity}
          title="Services"
          value={dashboardData?.services?.active || 0}
          subtitle="Active services"
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          title="Deployments"
          value={`${dashboardData?.deployments?.ready || 0}/${dashboardData?.deployments?.total || 0}`}
          subtitle="Ready deployments"
          color={(dashboardData?.deployments?.updating || 0) > 0 ? 'warning' : 'success'}
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
                  <span className="text-success-500 font-medium">{dashboardData?.pods?.running || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Pods Pending</span>
                  <span className="text-warning-500 font-medium">{dashboardData?.pods?.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Pods Failed</span>
                  <span className="text-error-500 font-medium">{dashboardData?.pods?.failed || 0}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Services</span>
                  <span className="text-primary-500 font-medium">{dashboardData?.services?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Deployments</span>
                  <span className="text-primary-500 font-medium">{dashboardData?.deployments?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Nodes Ready</span>
                  <span className="text-success-500 font-medium">{dashboardData?.nodes?.ready || 0}</span>
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
              {(dashboardData?.recentActivity || []).map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
              {(!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0) && (
                <div className="text-center py-4 text-secondary-500">
                  No recent activity
                </div>
              )}
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