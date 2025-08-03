#!/bin/bash

# Holitime Cloud Run Deployment Script
# This script builds and deploys the Holitime application to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID="elated-fabric-460119-t3"

SERVICE_NAME="holitime"
REGION="us-west2"  # Matching Cloud SQL region for lowest latency
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Holitime deployment to Google Cloud Run${NC}"

# Check if required tools are installed
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Authenticate with Google Cloud (if needed)
echo -e "${YELLOW}🔐 Checking Google Cloud authentication...${NC}"
# Check if an active account is logged in, if not, prompt for login
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔑 No active Google Cloud account found. Please authenticate...${NC}"
    gcloud auth login
else
    echo -e "${GREEN}✅ Already authenticated.${NC}"
fi


# Set the project
echo -e "${YELLOW}📝 Setting Google Cloud project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID} --quiet
gcloud config set account "binary411@gmail.com" --quiet

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
# Adding '|| true' to prevent script exit if APIs are already enabled
gcloud services enable cloudbuild.googleapis.com || true
gcloud services enable run.googleapis.com || true
gcloud services enable containerregistry.googleapis.com || true

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker
# Clean up Docker to free space
echo -e "${YELLOW}🧹 Cleaning up Docker...${NC}"
# Using '-f' for force and avoid interactive prompt
docker system prune -f

# Submit the build to Google Cloud Build
echo -e "${YELLOW}🏗️  Submitting build to Google Cloud Build...${NC}"
gcloud builds submit --config cloudbuild.yaml --substitutions=_NEXTAUTH_SECRET="fhwbiubwibuiwbuiwnuiwnfvew",_JWT_SECRET="anothersecretplaceholder"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "                                                                                     "
echo -e "                                                                                     "
echo -e "${GREEN}🌐 Your application is available at: ${SERVICE_URL}${NC}"
echo -e "                                                                                     "
echo -e "                                                                                     "
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo -e "                                                                                     "
echo -e "   1. Set up your environment variables in Cloud Run console                         "
echo -e "      (if you want to manage them there instead of in script)"
echo -e "                                                                                     "
echo -e "   2. Configure your database connection (if not fully set via env vars)"
echo -e "                                                                                     "
echo -e "   3. Set up your custom domain (if needed)"
echo -e "                                                                                     "
echo -e "   4. Configure authentication secrets (ensure they are secure and rotated regularly)"
echo -e "                                                                                     "
echo -e "${BLUE}Useful commands:${NC}"
echo -e "   View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo -e "                                                                                     "
echo -e "   Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
echo -e "                                                                                     "
echo -e "   Delete service: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"
