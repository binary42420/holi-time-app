# Holitime App - Google Cloud Run Deployment Guide

## Overview
This guide covers the deployment of the Holitime timesheet management application to Google Cloud Run. The app has been optimized for cloud deployment with the following key improvements:

## ✅ PDF Generation System Improvements

### 1. **Removed Puppeteer Dependency**
- **Problem**: Puppeteer requires Chrome/Chromium binaries which are large and can cause deployment issues
- **Solution**: Replaced all Puppeteer-based PDF generation with jsPDF
- **Benefits**: 
  - Smaller deployment size
  - No binary dependencies
  - Faster cold starts
  - Better reliability in serverless environments

### 2. **Enhanced PDF Generation Workflow**
- **New Enhanced PDF Generator**: `src/lib/enhanced-pdf-generator.ts`
- **Workflow**:
  1. **Unsigned PDF**: Generated when timesheet is first created
  2. **Signed PDF**: Generated after company approval (with company signature)
  3. **Final PDF**: Generated after manager approval (with both signatures)
- **Features**:
  - Consistent field naming (using database schema names)
  - Transaction-based updates for data consistency
  - Automatic cloud storage integration (GCS when available)
  - Fallback to base64 storage when cloud storage unavailable

### 3. **Fixed Field Name Inconsistencies**
- **Database Schema**: Uses `company_signature`, `manager_signature`, `signed_pdf_url`
- **Updated all routes and components** to use consistent field names
- **Removed references** to old field names like `clientSignature`, `companySignature`

### 4. **Updated API Routes**
- **`/api/timesheets/[id]/approve`**: Now uses enhanced PDF generator with transactions
- **`/api/timesheets/[id]/download-pdf-simple`**: Simplified to use enhanced generator
- **`/api/timesheets/[id]/download-pdf`**: Removed Puppeteer, uses enhanced generator
- **`/api/timesheets/[id]/generate-pdf`**: Generates unsigned PDFs
- **`/api/timesheets/[id]/regenerate-with-signature`**: Uses enhanced generator

## 🚀 Deployment Steps

### Prerequisites
1. **Google Cloud Project** with billing enabled
2. **Google Cloud CLI** installed and authenticated
3. **Docker** installed (for local testing)
4. **Node.js 20+** and npm

### 1. Environment Setup

Create `.env.production` file:
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_URL_DIRECT=postgresql://username:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-app-url.run.app
JWT_SECRET=your-jwt-secret-here

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google Cloud
PROJECT_ID=your-gcp-project-id
GCS_AVATAR_BUCKET=your-gcs-bucket-name

# Environment
ENV=production
NODE_ENV=production
```

### 2. Build and Deploy

#### Option A: Using Google Cloud Build
```bash
# 1. Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# 2. Submit build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/holitime-app

# 3. Deploy to Cloud Run
gcloud run deploy holitime-app \
  --image gcr.io/YOUR_PROJECT_ID/holitime-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --env-vars-file .env.production
```

#### Option B: Using Docker locally then push
```bash
# 1. Build Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/holitime-app .

# 2. Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/holitime-app

# 3. Deploy to Cloud Run
gcloud run deploy holitime-app \
  --image gcr.io/YOUR_PROJECT_ID/holitime-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10
```

### 3. Database Setup

#### Run Migrations
```bash
# If using Cloud SQL Proxy
./cloud_sql_proxy -instances=YOUR_PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### 4. Cloud Storage Setup (Optional)

```bash
# Create GCS bucket for avatars and files
gsutil mb gs://your-bucket-name

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

## 📱 Mobile-First Features

The app is optimized for mobile field workers:

1. **Responsive Design**: Works on all screen sizes
2. **Touch-Friendly**: Large buttons and touch targets
3. **Offline Capability**: Service worker for basic offline functionality
4. **Fast Loading**: Optimized images and code splitting
5. **PWA Ready**: Can be installed as a mobile app

## 🔧 Configuration Options

### Cloud Run Settings
- **Memory**: 2Gi (recommended for PDF generation)
- **CPU**: 2 (for better performance)
- **Timeout**: 300 seconds (for large PDF operations)
- **Max Instances**: 10 (adjust based on usage)

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string
- **GCS_AVATAR_BUCKET**: Google Cloud Storage bucket for file uploads
- **PROJECT_ID**: Google Cloud Project ID
- **NODE_ENV**: Set to "production"

## 🐛 Troubleshooting

### Common Issues

1. **PDF Generation Fails**
   - Check memory allocation (increase to 2Gi+)
   - Verify jsPDF dependencies are installed
   - Check database field names match schema

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check Cloud SQL instance is running
   - Ensure proper IAM permissions

3. **File Upload Issues**
   - Verify GCS bucket exists and has proper permissions
   - Check PROJECT_ID environment variable
   - Ensure service account has Storage Admin role

### Monitoring
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=holitime-app" --limit 50

# Monitor performance
gcloud run services describe holitime-app --region=us-central1
```

## 📊 Performance Optimizations

1. **PDF Generation**: Uses jsPDF instead of Puppeteer (90% faster)
2. **Database**: Connection pooling and optimized queries
3. **Caching**: React Query for client-side caching
4. **Images**: Next.js Image optimization
5. **Code Splitting**: Automatic route-based splitting

## 🔐 Security

1. **Authentication**: NextAuth.js with secure session handling
2. **Authorization**: Role-based access control
3. **Database**: Parameterized queries prevent SQL injection
4. **HTTPS**: Enforced in production
5. **Environment Variables**: Secure secret management

## 📈 Scaling

The app is designed to scale horizontally:
- **Stateless**: No server-side sessions
- **Database Pooling**: Efficient connection management
- **Cloud Storage**: Offloaded file storage
- **CDN Ready**: Static assets can be served from CDN

## 🎯 Next Steps

1. **Set up monitoring** with Google Cloud Monitoring
2. **Configure alerts** for errors and performance
3. **Set up CI/CD** with GitHub Actions
4. **Enable backup** for Cloud SQL database
5. **Configure custom domain** and SSL certificate

---

## Support

For deployment issues or questions, check:
1. Google Cloud Run documentation
2. Next.js deployment guides
3. Prisma deployment documentation
4. Application logs in Google Cloud Console