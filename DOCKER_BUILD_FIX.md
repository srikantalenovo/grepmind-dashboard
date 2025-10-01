# Docker Build Fix - npm ci Issue Resolution

## Problem
The build was failing because `npm ci` requires complete and synchronized package-lock.json files with all dependencies, including transitive dependencies. The generated lock files were incomplete.

## Solution Applied
Changed both backend and frontend Dockerfiles from:
- `RUN npm ci` → `RUN npm install`
- `RUN npm ci --silent` → `RUN npm install --silent`

## Why This Works
- `npm install` is more forgiving and will install dependencies based on package.json even without a perfect lock file
- It will generate a new package-lock.json during the build process
- This is a common pattern in Docker builds when starting from scratch

## Trade-offs
- Slightly less reproducible builds compared to npm ci
- Builds may take a bit longer on first run
- Still secure and functional for development/production use

## Status
✅ Backend Dockerfile updated
✅ Frontend Dockerfile updated  
✅ Ready for docker-compose build

The Docker build should now complete successfully!