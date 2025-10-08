# API URL Configuration Fix

## Issue Identified
The frontend was making requests to incorrect API endpoints due to double `/api` path in URLs:
- **Incorrect**: `http://dashboard.grepmind.com/api/api/auth/login`  
- **Correct**: `http://dashboard.grepmind.com/api/auth/login`

## Root Cause
The VITE_API_URL was set to `http://dashboard.grepmind.com/api`, but the frontend API service was appending `/api/auth/*` paths, resulting in `baseURL + /api/auth/endpoint = .../api/api/auth/...`

## Solution Applied
Updated the following configuration files to use the correct base URL:

### Frontend Environment Files
- `frontend/.env` - Changed VITE_API_URL from `/api` to domain only
- `frontend/.env.example` - Updated template
- `.env.example` - Updated root environment template

### Development Configuration  
- `frontend/vite.config.js` - Fixed proxy target URL
- `frontend/vite.config.js-bkp` - Updated backup configuration

### Helm Charts (Production Deployment)
- `helm/frontend/values.yaml` - Updated VITE_API_URL
- `helm/values-production.yaml` - Updated production values
- `helm-bkp/frontend/values.yaml` - Updated backup charts
- `helm-bkp/values-production.yaml` - Updated backup production values

## Changes Made
```diff
- VITE_API_URL=http://dashboard.grepmind.com/api
+ VITE_API_URL=http://dashboard.grepmind.com
```

## How It Works Now
1. **Frontend Environment**: `VITE_API_URL=http://dashboard.grepmind.com`
2. **API Service**: Makes requests to `/api/auth/login`
3. **Final URL**: `http://dashboard.grepmind.com` + `/api/auth/login` = `http://dashboard.grepmind.com/api/auth/login` ✅

## Backend Route Structure (Confirmed)
The backend correctly handles these routes:
- `/api/auth/*` - Authentication endpoints
- `/api/dashboard/*` - Dashboard data
- `/api/monitoring/*` - Monitoring endpoints
- `/api/resources/*` - Resource management

## Deployment Instructions
1. **Rebuild Frontend**: The frontend Docker image needs to be rebuilt to include the new environment variables
2. **Update Helm Values**: If using Helm, the updated values will be applied automatically
3. **Restart Frontend Pod**: Kubernetes will need to restart the frontend pod to pick up new environment variables

## Verification
After deployment, verify the fix by:
```bash
# Check frontend logs for correct API URLs
kubectl logs -f deployment/grepmind-dashboard-frontend

# Test login endpoint directly
curl -X POST http://dashboard.grepmind.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grepmind.com","password":"admin123!@#"}'
```

The login should now work correctly without 404 errors.
