#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
PROJECT_ID=${PROJECT_ID:-"elated-fabric-460119-t3"}
REGION=${REGION:-"us-west2"}
SERVICE_NAME=${SERVICE_NAME:-"holitime"}
print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
check_prerequisites() {
    print_step "Checking prerequisites..."
    command -v gcloud &> /dev/null || { print_error "gcloud CLI is not installed."; exit 1; }
    gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q . || { print_error "Not authenticated with gcloud. Run 'gcloud auth login' first."; exit 1; }
    print_success "Prerequisites check passed"
}
setup_project() {
    print_step "Setting up Google Cloud project..."
    gcloud config set project "$PROJECT_ID"
    print_step "Enabling required APIs..."
    gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com
    print_success "Project setup completed"
}
submit_build() {
    print_step "Submitting build to Google Cloud Build..."
    gcloud builds submit --config cloudbuild.yaml .
    print_success "Build submitted successfully"
}
show_deployment_info() {
    print_step "Deployment Information"
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo "Service URL: $SERVICE_URL"
    echo "Next steps:"
    echo "1. Update NEXTAUTH_URL to: $SERVICE_URL"
    echo "2. Configure Google OAuth redirect URIs: $SERVICE_URL/api/auth/callback/google"
    echo "3. Test your application: $SERVICE_URL"
    echo "4. Monitor logs: gcloud logs tail --service=\"$SERVICE_NAME\""
}
main() {
    echo -e "${BLUE}HoliTime Cloud Run Deployment${NC}"
    if [ "$PROJECT_ID" = "your-project-id" ]; then
        print_error "Please set PROJECT_ID environment variable or update the script"
        exit 1
    fi
    check_prerequisites
    setup_project
    submit_build
    show_deployment_info
}
main "$@"
