// API service for Kubernetes resources
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://dashboard.grepmind.com/api';

// Request debouncing to prevent excessive API calls
const requestCache = new Map();
const REQUEST_DEBOUNCE_TIME = 1000; // 1 second minimum between identical requests

const shouldDebounceRequest = (endpoint) => {
  const now = Date.now();
  const lastRequest = requestCache.get(endpoint);
  
  if (lastRequest && (now - lastRequest) < REQUEST_DEBOUNCE_TIME) {
    console.log(`🚦 Request to ${endpoint} debounced (too soon after last request)`);
    return true;
  }
  
  requestCache.set(endpoint, now);
  return false;
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const getStoredTokens = () => {
  try {
    const authData = localStorage.getItem('grepmind-auth');
    if (!authData) return { accessToken: null, refreshToken: null };
    
    const parsed = JSON.parse(authData);
    return {
      accessToken: parsed.state?.accessToken || null,
      refreshToken: parsed.state?.refreshToken || null,
    };
  } catch (error) {
    console.error('Error reading tokens from storage:', error);
    return { accessToken: null, refreshToken: null };
  }
};

const updateStoredTokens = (accessToken, refreshToken) => {
  try {
    const authData = localStorage.getItem('grepmind-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.state) {
        parsed.state.accessToken = accessToken;
        parsed.state.refreshToken = refreshToken;
        localStorage.setItem('grepmind-auth', JSON.stringify(parsed));
      }
    }
  } catch (error) {
    console.error('Error updating tokens in storage:', error);
  }
};

const apiRequest = async (endpoint, options = {}) => {
  // Check if we should debounce this request
  if (shouldDebounceRequest(endpoint)) {
    throw new Error('Request debounced - too many requests to the same endpoint');
  }
  
  const { accessToken } = getStoredTokens();
  
  // Debug logging
  console.log(`🔄 API Request to: ${API_BASE_URL}${endpoint}`);
  console.log('🔑 Access token present:', !!accessToken);
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('🔒 Got 401, attempting token refresh...');
      // Try to refresh token
      const { refreshToken } = getStoredTokens();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const { data } = await refreshResponse.json();
            updateStoredTokens(data.accessToken, data.refreshToken);
            console.log('✅ Token refreshed successfully');
            
            // Retry original request
            config.headers.Authorization = `Bearer ${data.accessToken}`;
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (!retryResponse.ok) {
              throw new ApiError(`Request failed: ${retryResponse.statusText}`, retryResponse.status);
            }
            
            const retryData = await retryResponse.json();
            if (!retryData.success) {
              throw new ApiError(retryData.error || 'Request failed');
            }
            
            return retryData.data;
          }
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          // Refresh failed, redirect to login
          localStorage.removeItem('grepmind-auth');
          window.location.href = '/login';
          throw new ApiError('Session expired. Please log in again.');
        }
      } else {
        console.log('❌ No refresh token available');
        // No refresh token, redirect to login
        window.location.href = '/login';
        throw new ApiError('Please log in to continue.');
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`, errorText);
      throw new ApiError(`Request failed: ${response.statusText}`, response.status);
    }
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      throw new ApiError(data.error || 'Request failed');
    }
    
    return data.data;
  } catch (error) {
    console.error(`❌ API Request error for ${endpoint}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error');
  }
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new ApiError(data.error || 'Login failed');
    }
    
    return data.data;
  },
  
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new ApiError(data.error || 'Registration failed');
    }
    
    return data.data;
  },
  
  logout: async (refreshToken) => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('grepmind-auth');
    }
  },
  
  refreshToken: async (refreshToken) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new ApiError(data.error || 'Token refresh failed');
    }
    
    return data.data;
  },
  
  getCurrentUser: async () => {
    return await apiRequest('/auth/me');
  },
};

// User API
export const userApi = {
  getProfile: () => apiRequest('/user/profile'),
  updateProfile: (data) => apiRequest('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  changePassword: (currentPassword, newPassword) => apiRequest('/user/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  getStats: () => apiRequest('/user/stats'),
  deleteAccount: (password, confirmation) => apiRequest('/user/delete', {
    method: 'DELETE',
    body: JSON.stringify({ password, confirmation }),
  }),
  getActivity: (page = 1, limit = 20) => 
    apiRequest(`/user/activity?page=${page}&limit=${limit}`),
  getAllUsers: () => apiRequest('/user/all'),
  createUser: (data) => apiRequest('/user/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateUserRole: (userId, role) => apiRequest(`/user/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }),
  toggleUserStatus: (userId) => apiRequest(`/user/${userId}/status`, {
    method: 'PUT',
  }),
  deleteUser: (userId) => apiRequest(`/user/${userId}`, {
    method: 'DELETE',
  }),
};

// Resources API
export const resourcesApi = {
  getNamespaces: () => apiRequest('/resources/namespaces'),
  getPods: (namespace = 'default') => 
    apiRequest(`/resources/pods?namespace=${namespace}`),
  getServices: (namespace = 'default') => 
    apiRequest(`/resources/services?namespace=${namespace}`),
  getDeployments: (namespace = 'default') => 
    apiRequest(`/resources/deployments?namespace=${namespace}`),
  getStatefulSets: (namespace = 'default') => 
    apiRequest(`/resources/statefulsets?namespace=${namespace}`),
  getDaemonSets: (namespace = 'default') => 
    apiRequest(`/resources/daemonsets?namespace=${namespace}`),
  getJobs: (namespace = 'default') => 
    apiRequest(`/resources/jobs?namespace=${namespace}`),
  getCronJobs: (namespace = 'default') => 
    apiRequest(`/resources/cronjobs?namespace=${namespace}`),
  getConfigMaps: (namespace = 'default') => 
    apiRequest(`/resources/configmaps?namespace=${namespace}`),
  getSecrets: (namespace = 'default') => 
    apiRequest(`/resources/secrets?namespace=${namespace}`),
  getPersistentVolumeClaims: (namespace = 'default') => 
    apiRequest(`/resources/persistentvolumeclaims?namespace=${namespace}`),
  getIngress: (namespace = 'default') => 
    apiRequest(`/resources/ingress?namespace=${namespace}`),
  getHelmReleases: (namespace = 'default') => 
    apiRequest(`/resources/helm-releases?namespace=${namespace}`),
  getSparkApplications: (namespace = 'default') => 
    apiRequest(`/resources/sparkapplications?namespace=${namespace}`),
  getResourceDetails: (resourceType, name, namespace = 'default') => 
    apiRequest(`/resources/${resourceType}/${name}?namespace=${namespace}`),
  getPodLogs: (name, namespace = 'default', options = {}) => {
    const params = new URLSearchParams({
      namespace,
      ...options,
    });
    return apiRequest(`/resources/pods/${name}/logs?${params}`);
  },
};

// Dashboard API with data sanitization
export const dashboardAPI = {
  getDashboardOverview: async () => {
    try {
      console.log('🔄 Making dashboard API request...');
      const result = await apiRequest('/dashboard/overview');
      console.log('✅ Dashboard API response received:', result);
      return sanitizeMetricsData(result);
    } catch (error) {
      console.error('❌ Dashboard API request failed:', error);
      throw error;
    }
  },
  getClusterInfo: async () => {
    const data = await apiRequest('/dashboard/cluster-info');
    return sanitizeMetricsData(data);
  },
};

export { ApiError };

// Chat API (placeholder - might be used by ChatPage.jsx)
export const chatAPI = {
  sendMessage: (message) => apiRequest('/chat/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  getHistory: (page = 1, limit = 20) => 
    apiRequest(`/chat/history?page=${page}&limit=${limit}`),
  clearHistory: () => apiRequest('/chat/clear', { method: 'DELETE' }),
};

// Documents API (placeholder - might be used by DocumentsPage.jsx)
export const documentsAPI = {
  getDocuments: (page = 1, limit = 20) => 
    apiRequest(`/documents?page=${page}&limit=${limit}`),
  uploadDocument: (formData) => apiRequest('/documents/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Don't set Content-Type for FormData
  }),
  deleteDocument: (id) => apiRequest(`/documents/${id}`, { method: 'DELETE' }),
  downloadDocument: (id) => apiRequest(`/documents/${id}/download`),
};

// ========================================
// PHASE-2 API ENDPOINTS
// ========================================

// Resource Manager API
export const resourceManagerAPI = {
  // YAML/JSON Editor
  validateResource: (content, format = 'yaml') => apiRequest('/resource-manager/validate', {
    method: 'POST',
    body: JSON.stringify({ content, format }),
  }),
  applyResource: (content, format = 'yaml', namespace = 'default', dryRun = false) => 
    apiRequest('/resource-manager/apply', {
      method: 'POST',
      body: JSON.stringify({ content, format, namespace, dryRun }),
    }),

  // Templates
  getTemplates: () => apiRequest('/resource-manager/templates'),
  getTemplate: (id) => apiRequest(`/resource-manager/templates/${id}`),

  // Resource Cloning
  cloneResource: (sourceNamespace, targetNamespace, resourceType, resourceName, newResourceName) =>
    apiRequest('/resource-manager/clone', {
      method: 'POST',
      body: JSON.stringify({ sourceNamespace, targetNamespace, resourceType, resourceName, newResourceName }),
    }),

  // Bulk Operations
  bulkDelete: (resources) => apiRequest('/resource-manager/bulk/delete', {
    method: 'POST',
    body: JSON.stringify({ resources }),
  }),

  // Advanced Search
  searchResources: (query, resourceTypes, namespaces, labels, annotations, limit) =>
    apiRequest('/resource-manager/search', {
      method: 'POST',
      body: JSON.stringify({ query, resourceTypes, namespaces, labels, annotations, limit }),
    }),
};

// 🔥 Data sanitization helper to prevent NaN values
const sanitizeMetricsData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitizeValue = (value) => {
    if (typeof value === 'number') {
      // Replace NaN, Infinity, -Infinity with 0
      if (!isFinite(value) || isNaN(value)) {
        return 0;
      }
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      return sanitizeObject(value);
    }
    return value;
  };
  
  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeValue);
    }
    
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeValue(obj[key]);
    });
    return sanitized;
  };
  
  return sanitizeObject(data);
};

// Monitoring API with data sanitization
export const monitoringAPI = {
  // Enhanced Metrics with time range support and sanitization
  getMetricsOverview: async (timeRange = '1h') => {
    const data = await apiRequest(`/monitoring/metrics/overview?timeRange=${timeRange}`);
    return sanitizeMetricsData(data);
  },
  getNodeMetrics: async (timeRange = '1h') => {
    const data = await apiRequest(`/monitoring/metrics/nodes?timeRange=${timeRange}`);
    return sanitizeMetricsData(data);
  },
  getPodMetrics: async (namespace = 'default', timeRange = '1h') => {
    const params = new URLSearchParams();
    params.append('namespace', namespace);
    params.append('timeRange', timeRange);
    const data = await apiRequest(`/monitoring/metrics/pods?${params}`);
    return sanitizeMetricsData(data);
  },

  // NEW: Enhanced time series metrics
  getTimeSeriesMetrics: async (options = {}) => {
    const {
      namespace = 'default',
      timeRange = '1h', 
      metrics = ['cpu', 'memory'], 
      resourceType = 'pods',
      startTime,
      endTime
    } = options;
    
    const params = new URLSearchParams();
    params.append('namespace', namespace);
    params.append('timeRange', timeRange);
    params.append('resourceType', resourceType);
    params.append('metrics', metrics.join(','));
    
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    const data = await apiRequest(`/monitoring/metrics/timeseries?${params}`);
    return sanitizeMetricsData(data);
  },

  // NEW: Multi-pod metrics for comparison charts
  getMultiPodMetrics: async (namespace = 'default', timeRange = '1h', podNames = []) => {
    const params = new URLSearchParams();
    params.append('namespace', namespace);
    params.append('timeRange', timeRange);
    if (podNames.length > 0) {
      params.append('pods', podNames.join(','));
    }
    const data = await apiRequest(`/monitoring/metrics/multipod?${params}`);
    return sanitizeMetricsData(data);
  },

  // Add compatibility functions for resources
  getNamespaces: () => resourcesApi.getNamespaces(),
  getPods: (namespace = 'default') => resourcesApi.getPods(namespace),

  // Events with time range support
  getEvents: (namespace, eventType, limit = 50, timeRange = '1h') => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (eventType) params.append('eventType', eventType);
    params.append('limit', limit);
    params.append('timeRange', timeRange);
    return apiRequest(`/monitoring/events?${params}`);
  },

  // Enhanced Performance Analytics with sanitization
  getPerformanceTrends: async (timeRange = '1h', metric = 'cpu', namespace = null) => {
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);
    params.append('metric', metric);
    if (namespace) params.append('namespace', namespace);
    const data = await apiRequest(`/monitoring/performance/trends?${params}`);
    return sanitizeMetricsData(data);
  },

  // Enhanced Alerts with time range filtering
  getAlerts: async (severity, status = 'active', timeRange = '1h') => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    params.append('status', status);
    params.append('timeRange', timeRange);
    const data = await apiRequest(`/monitoring/alerts?${params}`);
    return sanitizeMetricsData(data);
  },
  
  createAlertRule: (name, condition, severity, labels, actions) =>
    apiRequest('/monitoring/alerts/rules', {
      method: 'POST',
      body: JSON.stringify({ name, condition, severity, labels, actions }),
    }),

  // Enhanced Health with time range
  getMonitoringHealth: async (timeRange = '1h') => {
    const data = await apiRequest(`/monitoring/health?timeRange=${timeRange}`);
    return sanitizeMetricsData(data);
  },

  // NEW: Resource utilization trends
  getResourceTrends: async (options = {}) => {
    const {
      timeRange = '1h',
      namespace = 'default',
      resourceTypes = ['cpu', 'memory', 'storage'],
      aggregation = 'avg' // avg, max, min
    } = options;
    
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);
    params.append('namespace', namespace);
    params.append('resourceTypes', resourceTypes.join(','));
    params.append('aggregation', aggregation);
    
    const data = await apiRequest(`/monitoring/trends/resources?${params}`);
    return sanitizeMetricsData(data);
  },
};

// Workloads API
export const workloadsAPI = {
  // Deployments
  getDeployments: (namespace = 'default') => apiRequest(`/workloads/deployments?namespace=${namespace}`),
  scaleDeployment: (name, namespace, replicas) => apiRequest(`/workloads/deployments/${name}/scale`, {
    method: 'POST',
    body: JSON.stringify({ namespace, replicas }),
  }),
  restartDeployment: (name, namespace) => apiRequest(`/workloads/deployments/${name}/restart`, {
    method: 'POST',
    body: JSON.stringify({ namespace }),
  }),
  rollbackDeployment: (name, namespace, revision) => apiRequest(`/workloads/deployments/${name}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ namespace, revision }),
  }),

  // Logs
  getPodLogs: (podName, namespace = 'default', container, lines = 100, since = 3600, follow = false) => {
    const params = new URLSearchParams();
    params.append('namespace', namespace);
    if (container) params.append('container', container);
    params.append('lines', lines);
    params.append('since', since);
    params.append('follow', follow);
    return apiRequest(`/workloads/logs/${podName}?${params}`);
  },
  getPodContainers: (podName, namespace = 'default') =>
    apiRequest(`/workloads/logs/${podName}/containers?namespace=${namespace}`),

  // Scaling
  getHPA: (namespace = 'default') => apiRequest(`/workloads/hpa?namespace=${namespace}`),
  createHPA: (name, namespace, targetRef, minReplicas, maxReplicas, targetCPU) =>
    apiRequest('/workloads/hpa', {
      method: 'POST',
      body: JSON.stringify({ name, namespace, targetRef, minReplicas, maxReplicas, targetCPU }),
    }),

  // Rollout Strategies
  getRolloutStrategies: () => apiRequest('/workloads/rollout-strategies'),

  // Health Checks
  getHealthChecks: (deploymentName, namespace = 'default') =>
    apiRequest(`/workloads/health-checks/${deploymentName}?namespace=${namespace}`),
  updateHealthCheck: (deploymentName, namespace, containerName, probeType, probeConfig) =>
    apiRequest(`/workloads/health-checks/${deploymentName}`, {
      method: 'PUT',
      body: JSON.stringify({ namespace, containerName, probeType, probeConfig }),
    }),

  // Workload Status
  getWorkloadStatus: (namespace = 'default') => apiRequest(`/workloads/status?namespace=${namespace}`),
};

// Security API
export const securityAPI = {
  // Security Scanning
  getSecurityOverview: () => apiRequest('/security/scan/overview'),
  getVulnerabilities: (namespace, severity, limit = 50) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (severity) params.append('severity', severity);
    params.append('limit', limit);
    return apiRequest(`/security/scan/vulnerabilities?${params}`);
  },
  startSecurityScan: (namespace, scanType = 'full', images = []) =>
    apiRequest('/security/scan/start', {
      method: 'POST',
      body: JSON.stringify({ namespace, scanType, images }),
    }),

  // Compliance
  getComplianceOverview: () => apiRequest('/security/compliance/overview'),
  getCISBenchmark: () => apiRequest('/security/compliance/cis-benchmark'),
  startComplianceCheck: (checkType = 'full', categories = []) =>
    apiRequest('/security/compliance/check', {
      method: 'POST',
      body: JSON.stringify({ checkType, categories }),
    }),

  // RBAC Audit
  getRBACaudit: (riskLevel) => {
    const params = new URLSearchParams();
    if (riskLevel) params.append('riskLevel', riskLevel);
    return apiRequest(`/security/rbac/audit?${params}`);
  },
  getRoleBindings: (namespace) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    return apiRequest(`/security/rbac/bindings?${params}`);
  },

  // Network Policies
  getNetworkPolicies: (namespace) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    return apiRequest(`/security/network-policies?${params}`);
  },
  getNetworkPolicyCoverage: (namespace = 'default') =>
    apiRequest(`/security/network-policies/coverage?namespace=${namespace}`),

  // Security Reports
  generateSecurityReport: (reportType = 'comprehensive', format = 'json', namespaces = []) =>
    apiRequest('/security/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ reportType, format, namespaces }),
    }),
  getSecurityRecommendations: () => apiRequest('/security/recommendations'),
};

// Backward compatibility
export const authApi = authAPI;
export const userAPI = userApi;

