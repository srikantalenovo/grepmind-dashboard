import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '@components/LoadingSpinner';
import Layout from '@components/Layout';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('@pages/LoginPage'));
const SignupPage = React.lazy(() => import('@pages/SignupPage'));
const DashboardPage = React.lazy(() => import('@pages/DashboardPage'));
const ClustersPage = React.lazy(() => import('@pages/ClustersPage'));
const PodsPage = React.lazy(() => import('@pages/PodsPage'));
const DeploymentsPage = React.lazy(() => import('@pages/DeploymentsPage'));
const ServicesPage = React.lazy(() => import('@pages/ServicesPage'));
const NodesPage = React.lazy(() => import('@pages/NodesPage'));
const EventsPage = React.lazy(() => import('@pages/EventsPage'));
const MetricsPage = React.lazy(() => import('@pages/MetricsPage'));
const AlertsPage = React.lazy(() => import('@pages/AlertsPage'));
const SettingsPage = React.lazy(() => import('@pages/SettingsPage'));
const ProfilePage = React.lazy(() => import('@pages/ProfilePage'));
const NotFoundPage = React.lazy(() => import('@pages/NotFoundPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { isDark } = useTheme();
  
  // Apply dark mode class to document
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/clusters" element={<ClustersPage />} />
                    <Route path="/pods" element={<PodsPage />} />
                    <Route path="/deployments" element={<DeploymentsPage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/nodes" element={<NodesPage />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/metrics" element={<MetricsPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;