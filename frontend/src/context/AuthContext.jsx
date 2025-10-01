import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { authService } from '@services/authService';

// Auth context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  LOADING: 'LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  REFRESH_TOKEN: 'REFRESH_TOKEN'
};

// Initial state
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

// Auth reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOADING:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.tokens.accessToken,
        refreshToken: action.payload.tokens.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
      
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
      
    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };
      
    default:
      return state;
  }
}

// Auth provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor to add auth token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor to handle token refresh
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          state.refreshToken
        ) {
          originalRequest._retry = true;
          
          try {
            const refreshResult = await authService.refreshToken(state.refreshToken);
            
            dispatch({
              type: AUTH_ACTIONS.REFRESH_TOKEN,
              payload: refreshResult.tokens
            });
            
            // Update the failed request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshResult.tokens.accessToken}`;
            
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            handleLogout();
            toast.error('Session expired. Please login again.');
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [state.token, state.refreshToken]);
  
  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          const { token, refreshToken } = JSON.parse(savedAuth);
          
          if (token && refreshToken) {
            // Verify token with server
            const user = await authService.getProfile();
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user,
                tokens: { accessToken: token, refreshToken }
              }
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('auth');
      }
      
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
    };
    
    initializeAuth();
  }, []);
  
  // Save auth state to localStorage
  useEffect(() => {
    if (state.isAuthenticated && state.token && state.refreshToken) {
      localStorage.setItem('auth', JSON.stringify({
        token: state.token,
        refreshToken: state.refreshToken
      }));
    } else {
      localStorage.removeItem('auth');
    }
  }, [state.isAuthenticated, state.token, state.refreshToken]);
  
  // Auth actions
  const handleLogin = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOADING });
    
    try {
      const result = await authService.login(credentials);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: result
      });
      
      toast.success(`Welcome back, ${result.user.firstName || result.user.username}!`);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      throw error;
    }
  };
  
  const handleSignup = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOADING });
    
    try {
      const result = await authService.signup(userData);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: result
      });
      
      toast.success(`Welcome to GrepMind, ${result.user.firstName || result.user.username}!`);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Signup failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      throw error;
    }
  };
  
  const handleLogout = async () => {
    try {
      if (state.refreshToken) {
        await authService.logout(state.refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      localStorage.removeItem('auth');
      toast.success('Logged out successfully');
    }
  };
  
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };
  
  const value = {
    ...state,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    updateUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}