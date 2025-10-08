# Authentication Issues Fixed 🔐

## Issues Resolved

### 1. **Missing Registration Endpoint**
- ✅ Added `/api/auth/register` endpoint to backend
- ✅ Registration now works properly from the frontend

### 2. **Profile Endpoint Mismatch**
- ✅ Added `/api/auth/profile` (GET and PUT) endpoints
- ✅ Added `/api/auth/change-password` endpoint
- ✅ Frontend now communicates properly with backend

### 3. **Default Admin User Creation**
- ✅ Enhanced admin user creation logic
- ✅ Added admin verification and role enforcement
- ✅ Created manual admin creation scripts

### 4. **Database Seeding**
- ✅ Added comprehensive database seeding script
- ✅ Creates admin and sample users automatically

## Files Modified

### Backend Changes:
1. **`src/routes/auth.js`** - Added missing authentication endpoints
2. **`src/config/database.js`** - Enhanced admin user creation
3. **`scripts/create-admin.js`** - Manual admin creation script
4. **`scripts/seed-database.js`** - Complete database seeding
5. **`package.json`** - Added admin and seeding scripts
6. **`Dockerfile`** - Include scripts directory

### No Frontend Changes Required:
- Frontend authentication flow was already correct
- All API calls now have corresponding backend endpoints

## Quick Fix Commands

### Option 1: Manual Admin Creation (Fastest)
```bash
# Connect to your backend pod and run:
kubectl exec -it <backend-pod-name> -n grepmind -- npm run db:create-admin
```

### Option 2: Full Database Seeding
```bash
# This creates admin + sample users:
kubectl exec -it <backend-pod-name> -n grepmind -- npm run db:seed
```

### Option 3: Database Reset (Clean Start)
```bash
# This resets DB and creates all users:
kubectl exec -it <backend-pod-name> -n grepmind -- npm run db:reset
```

## Default User Credentials

### Admin User:
- **Email**: `admin@grepmind.com`
- **Password**: `admin123!@#`
- **Role**: `admin`

### Sample Users (created with seeding):
- **Editor**: `editor@grepmind.com` / `editor123`
- **Viewer**: `viewer@grepmind.com` / `viewer123`

## Testing Authentication

### 1. Test Login
```bash
curl -X POST http://dashboard.grepmind.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grepmind.com","password":"admin123!@#"}'
```

### 2. Test Registration
```bash
curl -X POST http://dashboard.grepmind.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
```

### 3. Verify Database
```bash
# Connect to PostgreSQL pod
kubectl exec -it <postgres-pod-name> -n grepmind -- psql -U <username> -d grepmind

# Check users
SELECT email, name, role, "isActive" FROM users;
```

## Deployment Commands

After applying these fixes:

1. **Rebuild and redeploy backend**:
```bash
# Update your backend image
docker build -t your-registry/grepmind-dashboard-backend:latest .
docker push your-registry/grepmind-dashboard-backend:latest

# Restart deployment
kubectl rollout restart deployment grepmind-dashboard-backend -n grepmind
```

2. **Verify the deployment**:
```bash
# Check pod status
kubectl get pods -n grepmind

# Check logs
kubectl logs -f deployment/grepmind-dashboard-backend -n grepmind

# Test authentication
curl -X POST http://dashboard.grepmind.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grepmind.com","password":"admin123!@#"}'
```

## Admin User Auto-Creation

The system now automatically:
1. Creates the default admin user on database connection
2. Ensures admin user has correct role and is active
3. Provides manual scripts for troubleshooting

## Security Notes

⚠️ **IMPORTANT**: Change the default admin password after first login!

The default password `admin123!@#` should be changed immediately in production environments.

## Troubleshooting

### Issue: "Admin user still not showing"
**Solution**: Run the manual admin creation script:
```bash
kubectl exec -it <backend-pod-name> -n grepmind -- npm run db:create-admin
```

### Issue: "Registration not working"
**Solution**: Verify the backend deployment includes the updated auth routes.

### Issue: "Login works but profile doesn't load"
**Solution**: Check that the `/api/auth/profile` endpoint is accessible.

All authentication issues should now be resolved! 🎉
