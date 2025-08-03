#!/bin/bash
# HoliTime Cloud Shell Deployment Script
# Run this in Google Cloud Shell at https://shell.cloud.google.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="elated-fabric-460119-t3"
REGION="us-west2"
SERVICE_NAME="holitime"
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"  # Update this with your repo

print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

print_step "🚀 HoliTime Cloud Run Deployment via Cloud Shell"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo

# Set project
print_step "Setting up Google Cloud project..."
gcloud config set project $PROJECT_ID
print_success "Project set to $PROJECT_ID"

# Enable APIs
print_step "Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    sql-component.googleapis.com
print_success "APIs enabled"

# Clone or update repository (if using Git)
if [ ! -d "holitime-app" ]; then
    print_step "Cloning repository..."
    # Uncomment and update the next line with your actual repo URL
    # git clone $REPO_URL holitime-app
    print_warning "Please upload your code to Cloud Shell or clone from your repository"
    print_warning "If you have the code locally, use 'gcloud cloud-shell scp' to upload"
    echo
    echo "To upload from local machine:"
    echo "gcloud cloud-shell scp --recurse /path/to/your/holitime-app cloudshell:~/"
    echo
    read -p "Press Enter when your code is available in Cloud Shell..."
fi

# Navigate to project directory
if [ -d "holitime-app" ]; then
    cd holitime-app
elif [ -d "my-next-app" ]; then
    cd my-next-app
else
    print_error "Project directory not found. Please ensure your code is in the current directory."
    exit 1
fi

# Submit build
print_step "Submitting build to Google Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

print_success "🎉 Build submitted successfully!"

# Get service URL
print_step "Getting service information..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
    print_success "🌐 Service deployed successfully!"
    echo "Service URL: $SERVICE_URL"
    echo
    echo "Next steps:"
    echo "1. Test your application: $SERVICE_URL"
    echo "2. Check logs: gcloud logs tail --service=$SERVICE_NAME"
    echo "3. Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
else
    print_warning "Service URL not available yet. Check Cloud Run console."
fi

print_success "Deployment completed!"