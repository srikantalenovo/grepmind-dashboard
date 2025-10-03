// API service for Kubernetes resources
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://dashboard.grepmind.com/api';

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
  const { accessToken } = getStoredTokens();
  
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
    
    if (response.status === 401) {
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
          // Refresh failed, redirect to login
	  localStorage.removeItem('grepmind-auth');
          window.location.href = '/login';
          throw new ApiError('Session expired. Please log in again.');
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
        throw new ApiError('Please log in to continue.');
      }
    }
    
    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.statusText}`, response.status);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new ApiError(data.error || 'Request failed');
    }
    
    return data.data;
  } catch (error) {
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

// Backward compatibility
export const authApi = authAPI;
export const userAPI = userApi;
