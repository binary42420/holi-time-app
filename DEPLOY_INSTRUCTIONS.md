# Manual Deployment Instructions

## Authentication Fixes Applied ✅

The following authentication issues have been fixed:

1. **Build-time detection logic** - Fixed to properly distinguish build vs runtime
2. **Google OAuth configuration** - Added proper authorization parameters
3. **Environment variable consistency** - Fixed NEXTAUTH_URL mismatch
4. **Enhanced error logging** - Added comprehensive auth debugging
5. **Database connection improvements** - Updated Prisma configuration

## Deploy to Google Cloud Run

### Option 1: Using Google Cloud Console (Recommended)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/cloudbuild/builds?project=elated-fabric-460119-t3

2. **Upload Your Code**
   - Zip your entire project folder: `c:\Users\ryley\WebstormProjects\untitled\my-next-app`
   - Or use Git to push to a repository and connect it to Cloud Build

3. **Trigger Build**
   - Click "Run Trigger" or "Submit Build"
   - Select your `cloudbuild.yaml` file
   - The build will take 5-10 minutes

### Option 2: Using Cloud Shell

1. **Open Cloud Shell**
   - Go to: https://shell.cloud.google.com

2. **Upload Files**
   ```bash
   # Upload your project files to Cloud Shell
   # You can drag and drop the zip file or use the upload button
   ```

3. **Extract and Deploy**
   ```bash
   # Extract your files
   unzip my-next-app.zip
   cd my-next-app
   
   # Set project
   gcloud config set project elated-fabric-460119-t3
   
   # Deploy
   gcloud builds submit --config cloudbuild.yaml .
   ```

## Google OAuth Setup (CRITICAL)

**You MUST configure Google OAuth redirect URIs or Google login will fail:**

1. Go to: https://console.cloud.google.com/apis/credentials?project=elated-fabric-460119-t3

2. Find your OAuth 2.0 Client ID: `438323004618-7351haftdo2dm9s8vgdo2gsaqfuj9h9i.apps.googleusercontent.com`

3. Click "Edit" and add these Authorized redirect URIs:
   ```
   https://holitime-app-438323004618.us-west2.run.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

4. Save the changes

## Testing After Deployment

### 1. Check Deployment Status
- URL: https://holitime-app-438323004618.us-west2.run.app
- Health Check: https://holitime-app-438323004618.us-west2.run.app/api/health

### 2. Test Authentication
- Auth Test: https://holitime-app-438323004618.us-west2.run.app/api/auth/test
- Login Page: https://holitime-app-438323004618.us-west2.run.app/login

### 3. Test Both Login Methods
1. **Email/Password Login**
   - Try logging in with existing user credentials
   - Check browser console for errors

2. **Google OAuth Login**
   - Click "Sign In with Google"
   - Should redirect to Google, then back to your app
   - Check for any redirect URI errors

## Troubleshooting

### If Authentication Still Fails:

1. **Check Server Logs**
   ```bash
   gcloud logs tail --service=holitime --project=elated-fabric-460119-t3
   ```

2. **Verify Environment Variables**
   - Go to Cloud Run console
   - Check that all environment variables are set correctly
   - Especially: NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

3. **Database Connection**
   - Verify DATABASE_URL is correct
   - Check Cloud SQL instance is running

### Common Issues:

- **"Server error"** → Environment variables not set correctly
- **"Invalid credentials"** → Database connection or user lookup issues  
- **OAuth redirect errors** → Redirect URIs not configured in Google Console
- **"Configuration error"** → NEXTAUTH_SECRET or NEXTAUTH_URL issues

## Quick Deploy Commands

If you have gcloud CLI installed locally:

```powershell
# Set project
gcloud config set project elated-fabric-460119-t3

# Deploy
gcloud builds submit --config cloudbuild.yaml .

# Check status
gcloud run services describe holitime --region=us-west2

# View logs
gcloud logs tail --service=holitime
```

## Success Indicators

✅ Build completes without errors  
✅ Service deploys to Cloud Run  
✅ Health check returns 200 OK  
✅ Auth test endpoint returns environment info  
✅ Email/password login works  
✅ Google OAuth login works  
✅ Users can access dashboard after login  

## Next Steps After Successful Deployment

1. Test the mobile-responsive login flow
2. Verify user sessions persist correctly
3. Test time tracking functionality
4. Monitor server logs for any issues
5. Set up monitoring and alerts

---

**Your app should be live at:** https://holitime-app-438323004618.us-west2.run.app

The authentication fixes are now in place and should resolve both the email/password and Google OAuth login issues you were experiencing.