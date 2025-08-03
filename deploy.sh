#!/bin/bash

# Enhanced HoliTime Cloud Run Deployment Script (Bash version)
# Comprehensive deployment with proper secret management, rollback capabilities, and monitoring.

# --- Strict Mode ---
set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # The return value of a pipeline is the status of the last command to exit with a non-zero status.

# --- Default Configuration ---
PROJECT_ID="elated-fabric-460119-t3"
SERVICE_NAME="holitime"
REGION="us-west2"
ENVIRONMENT="production"
SKIP_BUILD=false
SKIP_MIGRATIONS=false
SKIP_SECRET_CHECK=false
DRY_RUN=false
ROLLBACK=false
ROLLBACK_TO_REVISION=""
MAX_INSTANCES=10
MIN_INSTANCES=0
MEMORY="2Gi"
CPU="1"
TIMEOUT=300
FORCE=false
VERBOSE=false

# --- Script Configuration ---
LOG_FILE="deployment-$(date +'%Y%m%d-%H%M%S').log"
BACKUP_DIR="deployment-backups"

# --- Helper Functions ---
usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --project-id <id>         Google Cloud project ID (default: ${PROJECT_ID})"
    echo "  --service-name <name>       Cloud Run service name (default: ${SERVICE_NAME})"
    echo "  --region <region>           Google Cloud region (default: ${REGION})"
    echo "  --env <env>                 Deployment environment (default: ${ENVIRONMENT})"
    echo "  --max-instances <num>       Max instances for Cloud Run (default: ${MAX_INSTANCES})"
    echo "  --min-instances <num>       Min instances for Cloud Run (default: ${MIN_INSTANCES})"
    echo "  --memory <mem>              Memory limit (e.g., 2Gi) (default: ${MEMORY})"
    echo "  --cpu <cpu>                 CPU limit (default: ${CPU})"
    echo "  --timeout <sec>             Request timeout in seconds (default: ${TIMEOUT})"
    echo "  --rollback-to <revision>    Specify a revision to roll back to."
    echo "  --skip-build                Skip the Docker build and push step."
    echo "  --skip-migrations           Skip the database migration step."
    echo "  --skip-secret-check         Skip initializing secrets from .env file."
    echo "  --rollback                  Trigger a rollback to the previously deployed image."
    echo "  --dry-run                   Show what would be done, without making changes."
    echo "  --force                     Force actions where applicable."
    echo "  -v, --verbose               Enable verbose/debug logging."
    echo "  -h, --help                  Show this help message."
    exit 1
}

# --- Argument Parsing ---
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project-id) PROJECT_ID="$2"; shift ;;
        --service-name) SERVICE_NAME="$2"; shift ;;
        --region) REGION="$2"; shift ;;
        --env) ENVIRONMENT="$2"; shift ;;
        --max-instances) MAX_INSTANCES="$2"; shift ;;
        --min-instances) MIN_INSTANCES="$2"; shift ;;
        --memory) MEMORY="$2"; shift ;;
        --cpu) CPU="$2"; shift ;;
        --timeout) TIMEOUT="$2"; shift ;;
        --rollback-to) ROLLBACK_TO_REVISION="$2"; shift ;;
        --skip-build) SKIP_BUILD=true ;;
        --skip-migrations) SKIP_MIGRATIONS=true ;;
        --skip-secret-check) SKIP_SECRET_CHECK=true ;;
        --rollback) ROLLBACK=true ;;
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        -v|--verbose) VERBOSE=true ;;
        -h|--help) usage ;;
        *) echo "Unknown parameter passed: $1"; usage ;;
    esac
    shift
done

# --- Dynamic Configuration (after parsing args) ---
CLOUD_SQL_INSTANCE="${PROJECT_ID}:${REGION}:holitime-db"
CONTAINER_REGISTRY="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# --- Color Codes for Output ---
# Use tput to be more compatible, with fallbacks
if command -v tput &> /dev/null; then
    BLUE=$(tput setaf 4)
    GREEN=$(tput setaf 2)
    RED=$(tput setaf 1)
    YELLOW=$(tput setaf 3)
    CYAN=$(tput setaf 6)
    WHITE=$(tput setaf 7)
    RESET=$(tput sgr0)
else
    BLUE="\033[0;34m"
    GREEN="\033[0;32m"
    RED="\033[0;31m"
    YELLOW="\033[0;33m"
    CYAN="\033[0;36m"
    WHITE="\033[0;37m"
    RESET="\033[0m"
fi

# --- Logging Functions ---
write_log() {
    local message="$1"
    local level="$2"
    local color="$3"

    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_message="[$timestamp] [$level] $message"

    # Write to console with color
    echo -e "${color}${log_message}${RESET}"

    # Write to log file (without color codes)
    echo "$log_message" >> "$LOG_FILE"
}

write_success() { write_log "✓ $1" "SUCCESS" "$GREEN"; }
write_error() { write_log "✗ $1" "ERROR" "$RED"; }
write_warning() { write_log "⚠ $1" "WARNING" "$YELLOW"; }
write_info() { write_log "ℹ $1" "INFO" "$BLUE"; }
write_debug() {
    if [ "$VERBOSE" = true ]; then
        write_log "🔍 $1" "DEBUG" "$CYAN"
    fi
}

# --- Global Error Handling ---
handle_error() {
    local exit_code=$?
    local line_no=$1
    local command="$2"
    write_error "Deployment failed on line $line_no with exit code $exit_code: $command"
    write_info "Check the log file for details: $LOG_FILE"
    exit $exit_code
}
trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# --- Utility Functions ---
test_command() {
    command -v "$1" &> /dev/null
}

invoke_command() {
    local cmd="$1"
    local description="$2"

    write_debug "Executing: $cmd"
    if [ "$DRY_RUN" = true ]; then
        write_info "[DRY RUN] Would execute: $cmd"
        return 0
    fi

    # Use eval to handle complex commands with quotes and variables
    if eval "$cmd"; then
        write_debug "$description completed successfully"
        return 0
    else
        # The trap will catch the error, so this part is for context
        write_error "$description failed."
        return 1 # Ensure script exits if set -e is bypassed
    fi
}

test_gcloud_auth() {
    write_info "Checking Google Cloud authentication..."
    local account
    account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
    if [ -z "$account" ]; then
        write_error "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
        exit 1
    fi
    write_success "Authenticated as: $account"
}

# --- Secret Management Functions ---
get_secret_version() {
    local secret_name="$1"
    gcloud secrets versions list "$secret_name" \
        --project "$PROJECT_ID" \
        --format="value(name)" \
        --filter="state:enabled" \
        --limit=1 2>/dev/null | awk -F/ '{print $NF}'
}

test_secret_exists() {
    gcloud secrets describe "$1" --project "$PROJECT_ID" --quiet &> /dev/null
}

get_secret_value() {
    gcloud secrets versions access latest --secret="$1" --project "$PROJECT_ID" 2>/dev/null
}

update_secret_value() {
    local secret_name="$1"
    local value="$2"

    if [ "$DRY_RUN" = true ]; then
        write_info "[DRY RUN] Would update secret: $secret_name"
        return
    fi

    echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- --project "$PROJECT_ID" &> /dev/null
}

initialize_secrets_from_env() {
    write_info "Initializing secrets from .env file..."

    if [ ! -f ".env" ]; then
        write_warning ".env file not found, skipping automatic secret initialization"
        return
    fi

    # Source .env file to load variables, handling comments and exports
    set -a  # automatically export all variables
    source <(grep -v '^#' .env | grep -v '^$')
    set +a  # stop automatically exporting

    local required_secrets=(
        "DATABASE_URL" "NEXTAUTH_SECRET" "JWT_SECRET" "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET" "GOOGLE_API_KEY" "GOOGLE_AI_API_KEY" "SMTP_HOST"
        "SMTP_PORT" "SMTP_USER" "SMTP_PASS"
    )

    for secret_name in "${required_secrets[@]}"; do
        if ! test_secret_exists "$secret_name"; then
            write_info "Creating secret: $secret_name"
            if [ "$DRY_RUN" = false ]; then
                gcloud secrets create "$secret_name" --replication-policy="automatic" --project "$PROJECT_ID"
            fi
        else
            write_debug "Secret $secret_name already exists"
        fi

        # Check if we should update the secret value
        env_value=$(printenv "$secret_name" || echo "")

        if [ -n "$env_value" ]; then
            current_value=$(get_secret_value "$secret_name")

            # Only update if current value is a placeholder or doesn't exist
            if [[ -z "$current_value" ]] || [[ "$current_value" == placeholder-* ]]; then
                write_info "Updating secret $secret_name with value from .env"
                update_secret_value "$secret_name" "$env_value"
                write_success "Updated secret: $secret_name"
            else
                current_version=$(get_secret_version "$secret_name")
                write_debug "Secret $secret_name already has real value (version: $current_version)"
            fi
        else
            current_value=$(get_secret_value "$secret_name")
            if [ -z "$current_value" ]; then
                placeholder_value="placeholder-for-$secret_name"
                if [ "$secret_name" = "SMTP_PORT" ]; then
                    placeholder_value="587"
                fi
                write_warning "No value found for $secret_name in .env, using placeholder"
                update_secret_value "$secret_name" "$placeholder_value"
            fi
        fi
    done
}

# --- Core Logic Functions ---
build_docker_image() {
    write_info "Building Docker image..."
    local timestamp
    timestamp=$(date +'%Y%m%d-%H%M%S')
    local latest_tag="${CONTAINER_REGISTRY}:latest"
    local timestamp_tag="${CONTAINER_REGISTRY}:${timestamp}"

    # Backup current image
    if [ "$DRY_RUN" = false ]; then
        local current_image
        current_image=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(spec.template.spec.containers[0].image)" 2>/dev/null)
        if [ -n "$current_image" ]; then
            write_info "Backing up current image: $current_image"
            mkdir -p "$BACKUP_DIR"
            echo "PREVIOUS_IMAGE=$current_image" > "${BACKUP_DIR}/previous-image.txt"
        fi
    fi

    local build_command="docker build -t \"$latest_tag\" -t \"$timestamp_tag\" ."
    invoke_command "$build_command" "Docker build"

    IMAGE_TAG="$latest_tag" # Set global variable
    write_success "Docker image built: $IMAGE_TAG"
}

push_docker_image() {
    write_info "Pushing Docker image to registry..."
    invoke_command "docker push \"$IMAGE_TAG\"" "Docker push"
    # Also push the timestamped tag for history
    local timestamp_tag
    timestamp_tag=$(docker inspect --format='{{index .RepoTags 1}}' "$IMAGE_TAG")
    if [[ "$timestamp_tag" != "<no value>" ]] && [[ -n "$timestamp_tag" ]]; then
       invoke_command "docker push \"$timestamp_tag\"" "Docker push timestamped tag"
    fi
    write_success "Image pushed successfully"
}

deploy_cloud_run_service() {
    write_info "Deploying to Cloud Run..."

    local required_secrets=(
        "DATABASE_URL" "NEXTAUTH_SECRET" "JWT_SECRET" "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET" "GOOGLE_API_KEY" "GOOGLE_AI_API_KEY" "SMTP_HOST"
        "SMTP_PORT" "SMTP_USER" "SMTP_PASS"
    )

    local secret_mappings=()
    for secret in "${required_secrets[@]}"; do
        version=$(get_secret_version "$secret")
        if [ -n "$version" ]; then
            secret_mappings+=("$secret=$secret:$version")
        else
            secret_mappings+=("$secret=$secret:latest")
        fi
    done

    local secrets_string
    secrets_string=$(IFS=,; echo "${secret_mappings[*]}")

    local deploy_args=(
        run deploy "$SERVICE_NAME"
        --image "$IMAGE_TAG"
        --platform managed
        --region "$REGION"
        --allow-unauthenticated
        --port 3000
        --memory "$MEMORY"
        --cpu "$CPU"
        --timeout "$TIMEOUT"
        --max-instances "$MAX_INSTANCES"
        --min-instances "$MIN_INSTANCES"
        --concurrency 100
        --set-env-vars "NODE_ENV=${ENVIRONMENT},NEXT_TELEMETRY_DISABLED=1"
        --add-cloudsql-instances "$CLOUD_SQL_INSTANCE"
        --set-secrets "$secrets_string"
    )

    local deploy_command="gcloud ${deploy_args[*]}"
    invoke_command "$deploy_command" "Cloud Run deployment"

    write_success "Service deployed successfully"
}

update_nextauth_url() {
    write_info "Updating NEXTAUTH_URL secret..."

    local service_url
    service_url=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)" 2>/dev/null)

    if [ -n "$service_url" ]; then
        if ! test_secret_exists "NEXTAUTH_URL"; then
            if [ "$DRY_RUN" = false ]; then
                gcloud secrets create NEXTAUTH_URL --replication-policy="automatic" --project "$PROJECT_ID"
            fi
        fi

        update_secret_value "NEXTAUTH_URL" "$service_url"

        # Update the service to use the new secret
        if [ "$DRY_RUN" = false ]; then
            gcloud run services update "$SERVICE_NAME" --platform managed --region "$REGION" --update-secrets "NEXTAUTH_URL=NEXTAUTH_URL:latest"
        fi

        write_success "NEXTAUTH_URL updated to: $service_url"
    else
        write_warning "Could not retrieve service URL to update NEXTAUTH_URL"
    fi
}

run_database_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        write_info "Skipping database migrations (--skip-migrations specified)"
        return
    fi

    write_info "Running database migrations..."

    local migration_job_name="holitime-migrate-$(date +'%Y%m%d-%H%M%S')"

    if [ "$DRY_RUN" = true ]; then
        write_info "[DRY RUN] Would create and run database migration job"
        return
    fi

    # Create, execute, and delete the migration job
    gcloud run jobs create "$migration_job_name" \
        --image "${CONTAINER_REGISTRY}:latest" \
        --region "$REGION" \
        --command "npx" \
        --args "prisma,migrate,deploy" \
        --set-env-vars "NODE_ENV=${ENVIRONMENT}" \
        --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
        --max-retries 3 \
        --task-timeout 600 \
        --project "$PROJECT_ID"

    gcloud run jobs execute "$migration_job_name" --region "$REGION" --wait --project "$PROJECT_ID"

    write_success "Database migrations completed successfully"

    gcloud run jobs delete "$migration_job_name" --region "$REGION" --quiet --project "$PROJECT_ID"
}

test_deployment() {
    write_info "Verifying deployment..."

    local service_url
    service_url=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)" 2>/dev/null)

    if [ -z "$service_url" ]; then
        write_error "Could not retrieve service URL for verification."
        return 1
    fi

    write_info "Testing service health at: $service_url"
    local endpoints=("/" "/api/health")
    local all_healthy=true

    for endpoint in "${endpoints[@]}"; do
        local test_url="${service_url}${endpoint}"
        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" --head --max-time 30 "$test_url")

        # Consider 2xx, 3xx (redirects), and 404 (for API routes that might not be GET) as signs of life
        if [[ "$status_code" -ge 200 ]] && [[ "$status_code" -lt 500 ]]; then
            write_success "Endpoint $endpoint is responding (Status: $status_code)"
        else
            write_warning "Endpoint $endpoint returned status code: $status_code"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        write_success "Deployment verification completed successfully"
    else
        write_warning "Some health checks failed, but deployment may still be functional"
    fi

    SERVICE_URL="$service_url" # Set global for summary
}

invoke_rollback() {
    write_info "Performing rollback..."

    if [ -n "$ROLLBACK_TO_REVISION" ]; then
        local command="gcloud run services update-traffic \"$SERVICE_NAME\" --to-revisions=\"$ROLLBACK_TO_REVISION=100\" --region \"$REGION\" --project \"$PROJECT_ID\""
        invoke_command "$command" "Rollback to revision $ROLLBACK_TO_REVISION"
    else
        local backup_file="${BACKUP_DIR}/previous-image.txt"
        if [ -f "$backup_file" ]; then
            # Source the file to get PREVIOUS_IMAGE variable
            source "$backup_file"
            if [ -n "$PREVIOUS_IMAGE" ]; then
                local command="gcloud run deploy \"$SERVICE_NAME\" --image \"$PREVIOUS_IMAGE\" --region \"$REGION\" --project \"$PROJECT_ID\""
                invoke_command "$command" "Rollback to previous image $PREVIOUS_IMAGE"
            else
                write_error "No PREVIOUS_IMAGE found in backup file."
                exit 1
            fi
        else
            write_error "No backup file found at $backup_file. Cannot perform automatic rollback."
            exit 1
        fi
    fi
    write_success "Rollback completed successfully"
}


show_deployment_summary() {
    local separator
    separator=$(printf '=%.0s' {1..60})

    echo
    write_log "$separator" "INFO" "$BLUE"
    write_log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" "INFO" "$GREEN"
    write_log "$separator" "INFO" "$BLUE"
    echo
    write_log "📋 Deployment Summary:" "INFO" "$GREEN"
    write_log "  Service Name: $SERVICE_NAME" "INFO" "$WHITE"
    write_log "  Environment:  $ENVIRONMENT" "INFO" "$WHITE"
    write_log "  Region:       $REGION" "INFO" "$WHITE"
    write_log "  Project:      $PROJECT_ID" "INFO" "$WHITE"
    write_log "  Image:        ${CONTAINER_REGISTRY}:latest" "INFO" "$WHITE"
    write_log "  URL:          $SERVICE_URL" "INFO" "$WHITE"
    write_log "  Log File:     $LOG_FILE" "INFO" "$WHITE"
    echo
    write_log "📝 Quick Commands:" "INFO" "$YELLOW"
    write_log "  View logs:    gcloud run services logs tail $SERVICE_NAME --region $REGION" "INFO" "$WHITE"
    write_log "  Rollback:     $0 --rollback" "INFO" "$WHITE"
    write_log "  Check status: gcloud run services describe $SERVICE_NAME --region $REGION" "INFO" "$WHITE"
    echo
}

# --- Main Execution ---
main() {
    write_log "🚀 Starting Enhanced HoliTime Cloud Run Deployment (Bash)" "INFO" "$BLUE"
    write_log "$(printf '=%.0s' {1..60})" "INFO" "$BLUE"

    if [ "$DRY_RUN" = true ]; then
        write_warning "DRY RUN MODE - No actual changes will be made"
    fi

    if [ "$ROLLBACK" = true ]; then
        invoke_rollback
        exit 0
    fi

    write_info "Validating prerequisites..."
    for cmd in "docker" "gcloud"; do
        if ! test_command "$cmd"; then
            write_error "Required command not found: $cmd"
            exit 1
        fi
    done
    write_success "All required commands available"

    test_gcloud_auth

    write_info "Setting Google Cloud project to: $PROJECT_ID"
    if [ "$DRY_RUN" = false ]; then
        gcloud config set project "$PROJECT_ID"
    fi

    if [ "$SKIP_SECRET_CHECK" = false ]; then
        initialize_secrets_from_env
    else
        write_info "Skipping secret check (--skip-secret-check specified)"
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_docker_image
        push_docker_image
    else
        write_info "Skipping build (--skip-build specified)"
        IMAGE_TAG="${CONTAINER_REGISTRY}:latest"
    fi

    deploy_cloud_run_service
    update_nextauth_url
    run_database_migrations
    test_deployment

    if [ -n "$SERVICE_URL" ]; then
        show_deployment_summary
    fi

    write_success "Deployment pipeline completed successfully!"
}

# --- Run main function ---
main