import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Shield, 
  Eye,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const RoleBadge = ({ role }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-error-500/20 text-error-400 border-error-500/30';
      case 'editor': return 'bg-warning-500/20 text-warning-400 border-warning-500/30';
      case 'viewer': return 'bg-success-500/20 text-success-400 border-success-500/30';
      default: return 'bg-secondary-500/20 text-secondary-400 border-secondary-500/30';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleColor(role)}`}>
      <Shield className="w-3 h-3 inline mr-1" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

const StatusBadge = ({ isActive }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
    isActive 
      ? 'bg-success-500/20 text-success-400 border-success-500/30' 
      : 'bg-error-500/20 text-error-400 border-error-500/30'
  }`}>
    {isActive ? (
      <>
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Active
      </>
    ) : (
      <>
        <XCircle className="w-3 h-3 inline mr-1" />
        Inactive
      </>
    )}
  </span>
);

const UserRow = ({ user, onEdit, onToggleStatus, onDelete, currentUserId }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hover:bg-secondary-700/30 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-secondary-200">
              {user.fullName || user.username}
            </div>
            <div className="text-sm text-secondary-400">
              {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-400">
        {user.username}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge isActive={user.isActive} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-400">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-400">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="text-secondary-400 hover:text-secondary-200 transition-colors p-1"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-secondary-800 border border-secondary-700 rounded-md shadow-lg z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit(user);
                    setShowActions(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-secondary-200 hover:bg-secondary-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Edit Role
                </button>
                <button
                  onClick={() => {
                    onToggleStatus(user);
                    setShowActions(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-secondary-200 hover:bg-secondary-700 transition-colors"
                >
                  {user.isActive ? (
                    <>
                      <XCircle className="w-4 h-4 inline mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Activate
                    </>
                  )}
                </button>
                {user.id !== currentUserId && (
                  <button
                    onClick={() => {
                      onDelete(user);
                      setShowActions(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-error-400 hover:bg-secondary-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete User
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

const AdminPage = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const roles = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' }
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockUsers = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@grepmind.com',
          fullName: 'System Administrator',
          role: 'admin',
          isActive: true,
          lastLogin: new Date().toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          activityCount: 150
        },
        {
          id: '2',
          username: 'john_editor',
          email: 'john@grepmind.com',
          fullName: 'John Smith',
          role: 'editor',
          isActive: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          activityCount: 89
        },
        {
          id: '3',
          username: 'sarah_viewer',
          email: 'sarah@grepmind.com',
          fullName: 'Sarah Johnson',
          role: 'viewer',
          isActive: true,
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          activityCount: 42
        },
        {
          id: '4',
          username: 'mike_inactive',
          email: 'mike@grepmind.com',
          fullName: 'Mike Wilson',
          role: 'viewer',
          isActive: false,
          lastLogin: null,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          activityCount: 5
        }
      ];
      
      setUsers(mockUsers);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && user.isActive) ||
                         (selectedStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditUser = (user) => {
    // Implement edit user functionality
    console.log('Edit user:', user);
  };

  const handleToggleUserStatus = (user) => {
    // Implement toggle user status functionality
    console.log('Toggle status for user:', user);
  };

  const handleDeleteUser = (user) => {
    // Implement delete user functionality
    if (window.confirm(`Are you sure you want to delete user "${user.fullName || user.username}"?`)) {
      console.log('Delete user:', user);
    }
  };

  const getStatsData = () => {
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      admins: users.filter(u => u.role === 'admin').length,
      editors: users.filter(u => u.role === 'editor').length,
      viewers: users.filter(u => u.role === 'viewer').length
    };
  };

  const stats = getStatsData();

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
          <h3 className="text-lg font-semibold text-error-500 mb-2">Error Loading Users</h3>
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
          <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
          <p className="text-secondary-400 mt-1">
            Manage users and system permissions
          </p>
        </div>
        <button className="btn btn-primary flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-secondary-100">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        
        <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-success-400">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
        </div>
        
        <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Admins</p>
              <p className="text-2xl font-bold text-error-400">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-error-500" />
          </div>
        </div>
        
        <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Editors</p>
              <p className="text-2xl font-bold text-warning-400">{stats.editors}</p>
            </div>
            <Edit3 className="w-8 h-8 text-warning-500" />
          </div>
        </div>
        
        <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Viewers</p>
              <p className="text-2xl font-bold text-success-400">{stats.viewers}</p>
            </div>
            <Eye className="w-8 h-8 text-success-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary-900/50 border border-secondary-600 rounded-md pl-10 pr-3 py-2 text-secondary-200 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-secondary-900/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-secondary-900/50 border border-secondary-600 rounded-md px-3 py-2 text-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-secondary-800/50 backdrop-blur-sm border border-secondary-700/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-700/50">
            <thead className="bg-secondary-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-700/30">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleUserStatus}
                  onDelete={handleDeleteUser}
                  currentUserId={currentUser?.id}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-300 mb-2">No users found</h3>
            <p className="text-secondary-400">
              {searchQuery || selectedRole !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search criteria'
                : 'No users have been created yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;