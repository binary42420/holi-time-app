#!/bin/bash

# Migration script for production deployment
set -e

echo "🔄 Starting database migration process..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Checking current migration status..."
npx prisma migrate status

echo "🚀 Deploying migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations deployed successfully"
    
    echo "📊 Final migration status:"
    npx prisma migrate status
    
    echo "🎉 Migration process completed successfully!"
else
    echo "❌ Migration deployment failed"
    echo "📊 Current migration status:"
    npx prisma migrate status || true
    exit 1
fi