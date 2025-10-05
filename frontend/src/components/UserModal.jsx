import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Lock, Shield, Save, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';

const UserModal = ({ isOpen, onClose, onSubmit, initialUser = null, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer'
  });
  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState(false);

  const isEditing = !!initialUser;

  useEffect(() => {
    if (isOpen) {
      if (initialUser) {
        // Editing existing user
        setFormData({
          name: initialUser.name || '',
          email: initialUser.email || '',
          password: '',
          confirmPassword: '',
          role: initialUser.role || 'viewer'
        });
      } else {
        // Creating new user
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'viewer'
        });
      }
      setErrors({});
    }
  }, [isOpen, initialUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (only for new users or when password is provided)
    if (!isEditing || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role validation
    if (!['admin', 'editor', 'viewer'].includes(formData.role)) {
      newErrors.role = 'Please select a valid role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = {
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      role: formData.role
    };

    // Only include password for new users or when password is provided for existing users
    if (!isEditing || formData.password) {
      submitData.password = formData.password;
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-secondary-800 border border-secondary-700 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-700">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500/20 p-2 rounded-lg">
                <User className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary-100">
                  {isEditing ? 'Edit User' : 'Add New User'}
                </h2>
                <p className="text-sm text-secondary-400">
                  {isEditing ? 'Update user information and role' : 'Create a new user account'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-secondary-400 hover:text-secondary-200 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  disabled={isLoading}
                  className={`w-full bg-secondary-900/50 border rounded-md pl-10 pr-3 py-2 text-secondary-200 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                    errors.name ? 'border-error-500' : 'border-secondary-600'
                  }`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-error-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  disabled={isLoading}
                  className={`w-full bg-secondary-900/50 border rounded-md pl-10 pr-3 py-2 text-secondary-200 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                    errors.email ? 'border-error-500' : 'border-secondary-600'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Fields */}
            {!isEditing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      disabled={isLoading}
                      className={`w-full bg-secondary-900/50 border rounded-md pl-10 pr-3 py-2 text-secondary-200 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                        errors.password ? 'border-error-500' : 'border-secondary-600'
                      }`}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-error-400 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      disabled={isLoading}
                      className={`w-full bg-secondary-900/50 border rounded-md pl-10 pr-3 py-2 text-secondary-200 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                        errors.confirmPassword ? 'border-error-500' : 'border-secondary-600'
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error-400 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showPasswords"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-600 rounded bg-secondary-700"
                  />
                  <label htmlFor="showPasswords" className="ml-2 block text-sm text-secondary-300">
                    Show passwords
                  </label>
                </div>
              </>
            )}

            {/* Role Field */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                User Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full bg-secondary-900/50 border rounded-md pl-10 pr-3 py-2 text-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                    errors.role ? 'border-error-500' : 'border-secondary-600'
                  }`}
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="editor">Editor - Can modify content</option>
                  <option value="admin">Admin - Full system access</option>
                </select>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-error-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.role}
                </p>
              )}
            </div>

            {/* Role Description */}
            <div className="bg-secondary-900/30 border border-secondary-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-secondary-300 mb-2">Role Permissions:</h4>
              <div className="text-xs text-secondary-400 space-y-1">
                {formData.role === 'admin' && (
                  <>
                    <p>• Full system administration access</p>
                    <p>• Can manage all users and permissions</p>
                    <p>• Access to all system features</p>
                  </>
                )}
                {formData.role === 'editor' && (
                  <>
                    <p>• Can view and modify content</p>
                    <p>• Access to dashboard and resources</p>
                    <p>• Cannot manage other users</p>
                  </>
                )}
                {formData.role === 'viewer' && (
                  <>
                    <p>• Read-only access to content</p>
                    <p>• Can view dashboard and resources</p>
                    <p>• Cannot modify any content</p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-secondary-300 hover:text-secondary-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Update User' : 'Create User'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserModal;