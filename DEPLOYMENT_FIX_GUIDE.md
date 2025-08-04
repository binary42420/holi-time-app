# Deployment Fix Guide - ENOENT Error Resolution

## Problem
The error `ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(app)/page_client-reference-manifest.js'` was occurring during deployment to Google Cloud Run.

## Root Cause
The issue was caused by:
1. Incorrect startup script trying to use `server.js` instead of the standalone server
2. Path mismatches between Vercel build paths and the actual standalone build structure
3. ES module vs CommonJS conflicts in the startup script

## Solution Applied

### 1. Fixed start.js for ES Modules
- Updated `start.js` to use ES module syntax (import/export) since package.json has `"type": "module"`
- Properly references the standalone server at `.next/standalone/server.js`
- Added proper error handling and graceful shutdown

### 2. Updated Dockerfile
- Corrected file copying to use the standalone build structure
- Fixed permissions for the nextjs user
- Removed duplicate COPY commands

### 3. Fixed Cloud Build Configuration
- Updated port from 3000 to 8080 to match Dockerfile
- Ensured consistent port configuration across all files

### 4. Verified Build Process
- Confirmed Next.js standalone build creates proper structure
- Verified all required files are present in `.next/standalone/`

## Files Modified

1. **start.js** - Complete rewrite for ES modules and standalone server
2. **Dockerfile** - Fixed file copying and permissions
3. **cloudbuild.yaml** - Updated port configuration

## Testing

### Local Testing
```bash
# Build the app
npm run build

# Test production server locally
NODE_ENV=production PORT=8080 node start.js
```

### Docker Testing
```bash
# Run the test script
pwsh test-docker-build.ps1
```

### Cloud Run Deployment
```bash
# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

## Key Changes Summary

- ✅ Fixed ES module compatibility in start.js
- ✅ Corrected standalone server path resolution
- ✅ Fixed Docker file copying for standalone build
- ✅ Aligned port configuration (8080) across all files
- ✅ Added proper error handling and logging

## Mobile-First Considerations

The app is configured for mobile-first design with:
- Responsive viewport settings
- Touch-friendly UI components
- Optimized for field worker usage
- Fast loading with standalone build optimization

## Next Steps

1. Test the deployment using the updated configuration
2. Monitor Cloud Run logs for any remaining issues
3. Verify mobile functionality on deployed app
4. Set up proper health checks and monitoring

The ENOENT error should now be resolved with these fixes.