import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Server, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  Shield,
  Layers
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, role: 'viewer' },
  { name: 'Resources', href: '/resources', icon: Server, role: 'viewer' },
  { name: 'Admin', href: '/admin', icon: Shield, role: 'admin' },
  { name: 'Profile', href: '/profile', icon: User, role: 'viewer' },
]

// Helper function to check if user has access to navigation item
const hasNavAccess = (userRole, requiredRole) => {
  const roleHierarchy = {
    'admin': ['admin', 'editor', 'viewer'],
    'editor': ['editor', 'viewer'],
    'viewer': ['viewer']
  }
  
  return roleHierarchy[userRole]?.includes(requiredRole) || false
}

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-secondary-900/95 backdrop-blur-md',
          'border-r border-secondary-700/50 z-50'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-700/50">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Activity className="w-8 h-8 text-primary-500" />
                <Layers className="w-4 h-4 text-accent-400 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">GrepMind-Dashboard</h1>
                <p className="text-xs text-secondary-400">Kubernetes Monitor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-secondary-400 hover:text-secondary-200 transition-colors rounded-md"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation
              .filter(item => hasNavAccess(user?.role, item.role))
              .map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/resources' && location.pathname.startsWith('/resources'))
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                      'hover:bg-secondary-800/50 group',
                      isActive && 'bg-primary-600/20 border border-primary-500/30 text-primary-300'
                    )}
                  >
                    <item.icon className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-primary-400' : 'text-secondary-400 group-hover:text-secondary-200'
                    )} />
                    <span className={cn(
                      'font-medium transition-colors',
                      isActive ? 'text-primary-300' : 'text-secondary-300 group-hover:text-secondary-100'
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavItem"
                        className="ml-auto w-2 h-2 bg-primary-500 rounded-full"
                      />
                    )}
                  </Link>
                )
              })}
          </nav>
          
          {/* User section */}
          <div className="p-4 border-t border-secondary-700/50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-200 truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-xs text-secondary-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link
                to="/profile"
                className="flex-1 btn btn-ghost text-xs py-2"
                onClick={onClose}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 btn btn-ghost text-xs py-2 text-error-400 hover:text-error-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

const Header = ({ onMenuClick }) => {
  const { user } = useAuthStore()
  
  return (
    <header className="bg-secondary-900/80 backdrop-blur-md border-b border-secondary-700/50 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 text-secondary-400 hover:text-secondary-200 rounded-lg hover:bg-secondary-800/50 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-secondary-100">
              Welcome back, {user?.fullName?.split(' ')[0] || user?.username}!
            </h2>
            <p className="text-sm text-secondary-400">
              Monitor your Kubernetes resources
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-secondary-400">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}