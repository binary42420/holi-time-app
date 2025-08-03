#!/bin/bash

# HoliTime Cloud Run Deployment Script with Fixes
# This script builds and deploys the application to Google Cloud Run

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="elated-fabric-460119-t3"
SERVICE_NAME="holitime"
REGION="us-west2"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Function to print colored output
print_step() {
    echo -e "${BLUE}===> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

print_step "Starting HoliTime deployment to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"

# Authenticate with Google Cloud
print_step "Authenticating with Google Cloud..."
gcloud auth configure-docker

# Build the Docker image
print_step "Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .
print_success "Docker image built successfully"

# Push the image to Google Container Registry
print_step "Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}:latest
print_success "Image pushed successfully"

# Deploy to Cloud Run
print_step "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,JWT_SECRET=JWT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest"

print_success "Deployment completed successfully!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
print_success "Service deployed at: ${SERVICE_URL}"

# Update NEXTAUTH_URL secret if needed
print_step "Updating NEXTAUTH_URL secret..."
echo -n "${SERVICE_URL}" | gcloud secrets versions add NEXTAUTH_URL --data-file=-
print_success "NEXTAUTH_URL secret updated"

# Run database migrations
print_step "Running database migrations..."
print_warning "Please run the following command to execute migrations:"
echo ""
echo "gcloud run jobs create ${SERVICE_NAME}-migrate \\"
echo "    --image ${IMAGE_NAME}:latest \\"
echo "    --region ${REGION} \\"
echo "    --parallelism 1 \\"
echo "    --task-timeout 300 \\"
echo "    --max-retries 1 \\"
echo "    --set-secrets \"DATABASE_URL=DATABASE_URL:latest\" \\"
echo "    --command \"npx\" \\"
echo "    --args \"prisma,migrate,deploy\""
echo ""
echo "Then execute: gcloud run jobs execute ${SERVICE_NAME}-migrate --region ${REGION}"

print_step "Deployment Summary"
echo "===================="
echo "Service URL: ${SERVICE_URL}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "Image: ${IMAGE_NAME}:latest"
echo ""
print_warning "Important: Make sure all required secrets are configured in Google Secret Manager"
print_warning "Test the following routes to verify deployment:"
echo "  - ${SERVICE_URL}/login (should be accessible)"
echo "  - ${SERVICE_URL}/signup (should be accessible)"
echo "  - ${SERVICE_URL}/ (landing page should be accessible)"
