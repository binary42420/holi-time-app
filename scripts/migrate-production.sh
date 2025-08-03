#!/bin/bash

# Production Database Migration Script for Cloud Run
# This script handles database migrations in the production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check database connectivity
check_database() {
    print_step "Checking database connectivity..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    # Try to connect to database with a simple query
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Function to run database migrations
run_migrations() {
    print_step "Running database migrations..."
    
    # Check if prisma is available
    if ! command -v npx > /dev/null 2>&1; then
        print_error "npx not available"
        exit 1
    fi

    # Set SSL certificate path if it exists
    if [ -f "./ca.pem" ]; then
        export PGSSLROOTCERT="./ca.pem"
        print_success "SSL certificate configured"
    fi

    # Run migrations
    if npx prisma migrate deploy; then
        print_success "Database migrations completed successfully"
    else
        print_error "Database migrations failed"
        exit 1
    fi
}

# Function to generate Prisma client
generate_prisma_client() {
    print_step "Generating Prisma client..."
    
    if npx prisma generate; then
        print_success "Prisma client generated successfully"
    else
        print_error "Prisma client generation failed"
        exit 1
    fi
}

# Main function
main() {
    echo -e "${BLUE}Production Database Migration${NC}"
    echo "=============================="
    
    # Generate Prisma client first
    generate_prisma_client
    
    # Check database connectivity
    if check_database; then
        # Run migrations
        run_migrations
        print_success "Migration process completed successfully"
    else
        print_error "Cannot proceed without database connectivity"
        exit 1
    fi
}

# Run main function
main "$@"
