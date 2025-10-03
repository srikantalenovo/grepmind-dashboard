import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Trash2,
  Shield,
  Activity,
  Calendar,
  MessageSquare,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { userApi } from '../services/api'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils/date'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState(null)
  
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    avatarUrl: user?.avatarUrl || ''
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    password: '',
    confirmation: ''
  })
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await userApi.getStats()
        setStats(response.stats)
      } catch (error) {
        console.error('Error fetching user stats:', error)
      }
    }
    
    fetchStats()
  }, [])
  
  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true)
      const response = await userApi.updateProfile(profileData)
      updateUser(response.user)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleChangePassword = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match')
        return
      }
      
      if (passwordData.newPassword.length < 8) {
        toast.error('New password must be at least 8 characters long')
        return
      }
      
      setIsLoading(true)
      await userApi.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success('Password changed successfully. Please login again.')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      // Auto logout after password change
      setTimeout(() => logout(), 2000)
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    try {
      if (deleteConfirmation.confirmation !== 'DELETE_MY_ACCOUNT') {
        toast.error('Please type "DELETE_MY_ACCOUNT" to confirm')
        return
      }
      
      setIsLoading(true)
      await userApi.deleteAccount(deleteConfirmation.password, deleteConfirmation.confirmation)
      toast.success('Account deleted successfully')
      logout()
    } catch (error) {
      toast.error('Failed to delete account')
    } finally {
      setIsLoading(false)
    }
  }
  
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'Enter password' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[@$!%*?&]/.test(password)) score++
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-error-500', 'bg-warning-500', 'bg-warning-400', 'bg-success-400', 'bg-success-500']
    
    return {
      strength: (score / 5) * 100,
      label: labels[score - 1] || 'Very Weak',
      color: colors[score - 1] || 'bg-error-500'
    }
  }
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 }
  ]
  
  const passwordStrength = getPasswordStrength(passwordData.newPassword)
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          {user?.fullName || user?.username}
        </h1>
        <p className="text-secondary-400">{user?.email}</p>
        
        {stats && (
          <div className="flex justify-center space-x-8 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-primary-400">
                {stats.totalConversations}
              </div>
              <div className="text-sm text-secondary-400">Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-accent-400">
                {stats.totalMessages}
              </div>
              <div className="text-sm text-secondary-400">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-success-400">
                {stats.totalDocuments}
              </div>
              <div className="text-sm text-secondary-400">Documents</div>
            </div>
          </div>
        )}
      </motion.div>
      
      {/* Tabs */}
      <div className="border-b border-secondary-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-secondary-400 hover:text-secondary-200 hover:border-secondary-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'profile' && (
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="input pl-10 bg-secondary-800/50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-secondary-400 mt-1">Username cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input pl-10 bg-secondary-800/50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-secondary-400 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  className="input"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={profileData.avatarUrl}
                  onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                  className="input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input pl-10 pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-200"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input pl-10 pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-200"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {passwordData.newPassword && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-secondary-400 mb-1">
                      <span>Password strength</span>
                      <span>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full bg-secondary-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input pl-10 pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-200"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-error-400 text-sm mt-1">Passwords do not match</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'activity' && (
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Activity</h2>
            
            {stats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-8 h-8 text-primary-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalConversations}</div>
                        <div className="text-sm text-secondary-400">Total Conversations</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-8 h-8 text-accent-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
                        <div className="text-sm text-secondary-400">Messages Sent</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-success-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalDocuments}</div>
                        <div className="text-sm text-secondary-400">Documents Created</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-secondary-800/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-secondary-400" />
                      <div>
                        <div className="text-sm font-medium text-white">Member since</div>
                        <div className="text-xs text-secondary-400">{formatDate(stats.memberSince)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-secondary-800/30 rounded-lg">
                      <Activity className="w-5 h-5 text-accent-400" />
                      <div>
                        <div className="text-sm font-medium text-white">This week</div>
                        <div className="text-xs text-secondary-400">
                          {stats.conversationsThisWeek} conversations, {stats.messagesThisWeek} messages
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'danger' && (
          <div className="card border-error-500/30 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-error-400 mb-2">Danger Zone</h2>
              <p className="text-secondary-400">
                These actions are irreversible. Please proceed with caution.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={deleteConfirmation.password}
                  onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, password: e.target.value })}
                  className="input"
                  placeholder="Enter your password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Type "DELETE_MY_ACCOUNT" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation.confirmation}
                  onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, confirmation: e.target.value })}
                  className="input"
                  placeholder="DELETE_MY_ACCOUNT"
                />
              </div>
              
              <div className="bg-error-600/20 border border-error-500/50 rounded-lg p-4">
                <h3 className="text-error-400 font-semibold mb-2">⚠️ Delete Account</h3>
                <p className="text-secondary-300 text-sm mb-4">
                  This will permanently delete your account and all associated data, including:
                </p>
                <ul className="text-secondary-400 text-sm space-y-1 mb-4">
                  <li>• All conversations and messages</li>
                  <li>• All uploaded documents</li>
                  <li>• Profile information and settings</li>
                  <li>• Account access and login credentials</li>
                </ul>
                
                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading || !deleteConfirmation.password || deleteConfirmation.confirmation !== 'DELETE_MY_ACCOUNT'}
                  className="btn btn-danger flex items-center space-x-2"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Delete Account Permanently</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ProfilePage