import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth service
export const authService = {
  // Login user
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  // Register new user
  async signup(userData) {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  
  // Refresh access token
  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  
  // Logout user
  async logout(refreshToken) {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },
  
  // Logout from all devices
  async logoutAll() {
    const response = await api.post('/auth/logout-all');
    return response.data;
  },
  
  // Get user profile
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },
  
  // Change password
  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

// User service
export const userService = {
  // Update user profile
  async updateProfile(userData) {
    const response = await api.put('/users/profile', userData);
    return response.data;
  }
};

// Kubernetes service
export const kubernetesService = {
  // Get cluster information
  async getClusterInfo() {
    const response = await api.get('/kubernetes/cluster');
    return response.data;
  },
  
  // Get namespaces
  async getNamespaces() {
    const response = await api.get('/kubernetes/namespaces');
    return response.data;
  },
  
  // Get pods
  async getPods(namespace = null, filters = {}) {
    const params = new URLSearchParams(filters);
    const url = namespace 
      ? `/kubernetes/namespaces/${namespace}/pods?${params}`
      : `/kubernetes/pods?${params}`;
    const response = await api.get(url);
    return response.data;
  },
  
  // Get deployments
  async getDeployments(namespace = null) {
    const url = namespace 
      ? `/kubernetes/namespaces/${namespace}/deployments`
      : '/kubernetes/deployments';
    const response = await api.get(url);
    return response.data;
  },
  
  // Get services
  async getServices(namespace = null) {
    const url = namespace 
      ? `/kubernetes/namespaces/${namespace}/services`
      : '/kubernetes/services';
    const response = await api.get(url);
    return response.data;
  },
  
  // Get nodes
  async getNodes() {
    const response = await api.get('/kubernetes/nodes');
    return response.data;
  },
  
  // Get events
  async getEvents(namespace = null, filters = {}) {
    const params = new URLSearchParams(filters);
    const url = namespace 
      ? `/kubernetes/namespaces/${namespace}/events?${params}`
      : `/kubernetes/events?${params}`;
    const response = await api.get(url);
    return response.data;
  },
  
  // Scale deployment
  async scaleDeployment(namespace, deploymentName, replicas) {
    const response = await api.post(
      `/kubernetes/namespaces/${namespace}/deployments/${deploymentName}/scale`,
      { replicas }
    );
    return response.data;
  },
  
  // Get resource usage
  async getResourceUsage(namespace = null, timeRange = '1h') {
    const url = namespace 
      ? `/kubernetes/namespaces/${namespace}/usage?timeRange=${timeRange}`
      : `/kubernetes/usage?timeRange=${timeRange}`;
    const response = await api.get(url);
    return response.data;
  },
  
  // Health check
  async healthCheck() {
    const response = await api.get('/kubernetes/health');
    return response.data;
  }
};

// Metrics service
export const metricsService = {
  // Get cluster metrics
  async getClusterMetrics(timeRange = '1h') {
    const response = await api.get(`/metrics/cluster?timeRange=${timeRange}`);
    return response.data;
  }
};

// Dashboard service
export const dashboardService = {
  // Get dashboards
  async getDashboards() {
    const response = await api.get('/dashboards');
    return response.data;
  },
  
  // Create dashboard
  async createDashboard(dashboardData) {
    const response = await api.post('/dashboards', dashboardData);
    return response.data;
  },
  
  // Update dashboard
  async updateDashboard(dashboardId, dashboardData) {
    const response = await api.put(`/dashboards/${dashboardId}`, dashboardData);
    return response.data;
  },
  
  // Delete dashboard
  async deleteDashboard(dashboardId) {
    const response = await api.delete(`/dashboards/${dashboardId}`);
    return response.data;
  }
};

// Alerts service
export const alertsService = {
  // Get alerts
  async getAlerts(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/alerts?${params}`);
    return response.data;
  }
};

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Network error. Please check your connection.');
    }
    
    // Handle API errors
    const { status, data } = error.response;
    
    if (status >= 500) {
      console.error('Server error:', data);
      throw new Error('Server error. Please try again later.');
    }
    
    // Let the error bubble up with the original response
    throw error;
  }
);

export default api;