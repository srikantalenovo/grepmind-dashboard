import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './stores/authStore'
import { Layout } from './components/Layout'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ResourcesPage from './pages/ResourcesPage'
import ResourceManagerPage from './pages/ResourceManagerPage'
import MonitoringPage from './pages/MonitoringPage'
import WorkloadsPage from './pages/WorkloadsPage'
import SecurityPage from './pages/SecurityPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import LandingPage from './pages/LandingPage'

// Protected Route Component with RBAC
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Check role-based access
  if (requiredRole) {
    const hasAccess = checkRoleAccess(user?.role, requiredRole)
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-error-500 mb-2">Access Denied</h1>
            <p className="text-secondary-400">You don't have permission to access this page.</p>
            <p className="text-secondary-500 text-sm mt-2">Required role: {requiredRole}</p>
          </div>
        </div>
      )
    }
  }
  
  return children
}

// Helper function to check role access
const checkRoleAccess = (userRole, requiredRole) => {
  const roleHierarchy = {
    'admin': ['admin', 'editor', 'viewer'],
    'editor': ['editor', 'viewer'],
    'viewer': ['viewer']
  }
  
  return roleHierarchy[userRole]?.includes(requiredRole) || false
}

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />
}

function App() {
  const { initializeAuth, isLoading } = useAuthStore()
  
  useEffect(() => {
    initializeAuth()
  }, [])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-4">
            <LoadingSpinner size="xl" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">GrepMind-Dashboard</h1>
          <p className="text-secondary-400">Initializing Kubernetes monitoring...</p>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute requiredRole="viewer">
                <Layout>
                  <ResourcesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute requiredRole="viewer">
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-manager"
            element={
              <ProtectedRoute requiredRole="editor">
                <Layout>
                  <ResourceManagerPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring"
            element={
              <ProtectedRoute requiredRole="viewer">
                <Layout>
                  <MonitoringPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workloads"
            element={
              <ProtectedRoute requiredRole="editor">
                <Layout>
                  <WorkloadsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute requiredRole="editor">
                <Layout>
                  <SecurityPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App