#!/bin/bash

# HoliTime Production Startup Script
# This script handles database migrations, seeding, and starts the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
        print_warning "Database connection failed, retrying in 5 seconds..."
        sleep 5
        if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            print_success "Database connection successful on retry"
            return 0
        else
            print_error "Database connection failed after retry"
            return 1
        fi
    fi
}

# Function to run database migrations
run_migrations() {
    print_step "Running database migrations..."

    # Check if prisma is available
    if ! command -v npx > /dev/null 2>&1; then
        print_warning "npx not available, skipping migrations"
        return 0
    fi

    if npx prisma migrate deploy; then
        print_success "Database migrations completed successfully"
    else
        print_warning "Database migrations failed, but continuing with startup"
        return 0
    fi
}

# Function to seed the database
seed_database() {
    print_step "Checking if database needs seeding..."

    # Check if npm and prisma are available
    if ! command -v npm > /dev/null 2>&1 || ! command -v npx > /dev/null 2>&1; then
        print_warning "npm/npx not available, skipping seeding"
        return 0
    fi

    # Try to check if users table has any data
    USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM companies;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "1")

    if [ "$USER_COUNT" -eq "0" ]; then
        print_step "Companies table is empty, running seed script..."
        if npm run db:seed:prod; then
            print_success "Database seeding completed successfully"
        else
            print_warning "Database seeding failed, but continuing with startup"
        fi
    else
        print_success "Database already contains data, skipping seeding"
    fi
}

# Function to generate Prisma client (in case it's needed)
generate_prisma_client() {
    print_step "Checking Prisma client..."

    # Check if Prisma client already exists
    if [ -d "node_modules/.prisma" ]; then
        print_success "Prisma client already available"
        return 0
    fi

    print_step "Generating Prisma client..."
    if npx prisma generate; then
        print_success "Prisma client generated successfully"
    else
        print_warning "Prisma client generation failed, but continuing..."
        return 0
    fi
}

# Main startup function
main() {
    echo -e "${BLUE}HoliTime Production Startup${NC}"
    echo "============================="
    
    # Check if we're in production
    if [ "$NODE_ENV" = "production" ]; then
        print_step "Starting production initialization..."
        
        # Generate Prisma client
        generate_prisma_client
        
        # Check database connectivity
        if check_database; then
            # Run migrations
            run_migrations
            
            # Seed database if needed
            seed_database
        else
            print_error "Cannot proceed without database connectivity"
            exit 1
        fi
        
        print_success "Production initialization completed"
    else
        print_warning "Not in production mode, skipping database initialization"
    fi
    
    # Start the application
    print_step "Starting HoliTime application..."

    # Set the PORT environment variable if not set
    export PORT=${PORT:-3000}

    # Start the Next.js standalone server
    exec node server.js
}

# Handle signals gracefully
trap 'print_warning "Received shutdown signal, stopping application..."; exit 0' SIGTERM SIGINT

# Run the main function
main "$@"
