# User Management System - Admin Panel

## Overview

The User Management System provides comprehensive admin capabilities for managing users within the GrepMind application. This feature allows admin users to create, view, edit, and manage user accounts with role-based permissions.

## Features

### 🔒 Admin-Only Access
- Only users with `admin` role can access user management features
- All operations are protected by backend authentication middleware
- Comprehensive audit logging for all user management actions

### 👥 User Operations

#### 1. **Create New Users**
- ✅ Create users with email, name, password, and role
- ✅ Role selection: Admin, Editor, or Viewer
- ✅ Password validation with security requirements
- ✅ Email uniqueness validation
- ✅ Real-time form validation with error messages

#### 2. **View All Users**
- ✅ Paginated user list with search and filtering
- ✅ Real-time user statistics (total, active, by role)
- ✅ User status indicators (active/inactive)
- ✅ Last login and creation date information

#### 3. **Edit User Roles**
- ✅ Update user roles (admin → editor → viewer)
- ✅ Role permission descriptions
- ✅ Immediate updates with confirmation

#### 4. **Toggle User Status**
- ✅ Activate/deactivate user accounts
- ✅ Automatic token revocation for deactivated users
- ✅ Prevents self-status modification

#### 5. **Delete Users**
- ✅ Permanent user deletion with confirmation
- ✅ Double confirmation system ("DELETE" typing)
- ✅ Cascading deletion of user data (tokens, logs)
- ✅ Prevents self-deletion

## File Structure

### Frontend Components
```
frontend/src/
├── components/
│   └── UserModal.jsx          # User creation/editing modal
├── pages/
│   └── AdminPage.jsx          # Main admin panel with user management
└── services/
    └── api.js                 # API service with user endpoints
```

### Backend Routes
```
backend/src/routes/
└── user.js                   # User management API endpoints
```

## API Endpoints

### User Management (Admin Only)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `GET` | `/api/user/all` | Get all users | - |
| `POST` | `/api/user/create` | Create new user | `{email, password, name, role}` |
| `PUT` | `/api/user/:userId/role` | Update user role | `{role}` |
| `PUT` | `/api/user/:userId/status` | Toggle user status | - |
| `DELETE` | `/api/user/:userId` | Delete user | - |

## Role Hierarchy

### Admin
- ✅ Full system administration access
- ✅ Can manage all users and permissions
- ✅ Access to all system features
- ✅ Can create, edit, activate/deactivate, and delete users

### Editor
- ✅ Can view and modify content
- ✅ Access to dashboard and resources
- ❌ Cannot manage other users

### Viewer
- ✅ Read-only access to content
- ✅ Can view dashboard and resources
- ❌ Cannot modify any content
- ❌ Cannot manage users

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (RBAC)
- Admin-only middleware protection
- Session management with refresh tokens

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- bcrypt hashing with salt factor 12
- Secure password confirmation

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF protection

### Audit Logging
- Comprehensive activity logging for all user operations
- IP address and user agent tracking
- Timestamp and action details
- Admin action attribution

## Usage Instructions

### For Admin Users

#### 1. **Accessing User Management**
1. Login with admin credentials
2. Navigate to "Admin Panel" from the sidebar
3. View user statistics and list

#### 2. **Creating New Users**
1. Click "Add User" button
2. Fill in the form:
   - Full Name (required)
   - Email Address (required, unique)
   - Password (required, secure)
   - Confirm Password (must match)
   - Select Role (admin/editor/viewer)
3. Review role permissions description
4. Click "Create User" to save

#### 3. **Managing Existing Users**
1. Find user in the list (use search/filters)
2. Click the "⋮" menu button for options:
   - **Edit Role**: Change user's role
   - **Activate/Deactivate**: Toggle user status
   - **Delete User**: Permanently remove user

#### 4. **Search and Filtering**
- **Search**: Filter by name or email
- **Role Filter**: Show users by role (admin/editor/viewer)
- **Status Filter**: Show active or inactive users
- **Refresh**: Reload user list

## Error Handling

### Common Errors
- **Email already exists**: Choose a different email
- **Weak password**: Use stronger password meeting requirements
- **Cannot modify self**: Admins cannot change their own status/delete themselves
- **User not found**: User may have been deleted by another admin
- **Permission denied**: Ensure you have admin role

### Troubleshooting
1. **User creation fails**: Check email uniqueness and password strength
2. **Cannot see admin panel**: Verify admin role assignment
3. **Actions not working**: Check browser console for detailed error messages
4. **Session expired**: Re-login and try again

## Development Notes

### Component Architecture
- **UserModal**: Reusable modal for create/edit operations
- **AdminPage**: Main container with state management
- **UserRow**: Individual user display with actions
- **Role/Status Badges**: Visual indicators

### State Management
- React hooks for local state
- Loading states for async operations
- Error handling with user feedback
- Optimistic updates with rollback

### API Integration
- Centralized API service
- Automatic token management
- Request/response logging
- Error boundary handling

## Future Enhancements

### Planned Features
- [ ] Bulk user operations (import/export)
- [ ] Advanced user permissions (custom roles)
- [ ] User profile photos
- [ ] Password reset functionality
- [ ] User invitation system
- [ ] Activity timeline per user

### Performance Optimizations
- [ ] Virtualized user list for large datasets
- [ ] Server-side pagination
- [ ] Real-time user status updates
- [ ] Caching strategies

## Testing

### Test Cases
1. **User Creation**
   - Valid user creation
   - Email uniqueness validation
   - Password strength validation
   - Role assignment verification

2. **User Management**
   - Role updates
   - Status toggling
   - User deletion
   - Search and filtering

3. **Security**
   - Admin-only access
   - Self-modification prevention
   - Token invalidation on status change
   - Audit log creation

### Manual Testing Steps
1. Login as admin user
2. Navigate to Admin Panel
3. Test all CRUD operations
4. Verify error handling
5. Check audit logs

## Deployment

### Frontend Deployment
```bash
# In frontend directory
npm run build
# Deploy build folder to your hosting service
```

### Backend Deployment
```bash
# In backend directory
npm run build  # if applicable
# Deploy to your server with environment variables
```

### Environment Variables
```env
# Required for JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Database connection
DATABASE_URL=your-database-connection-string
```

## Support

For issues or questions regarding the user management system:
1. Check browser console for detailed error messages
2. Verify admin role permissions
3. Review API response logs
4. Contact system administrator

---

**Author**: MiniMax Agent  
**Last Updated**: 2025-10-04  
**Version**: 1.0.0