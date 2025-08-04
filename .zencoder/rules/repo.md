---
description: Repository Information Overview
alwaysApply: true
---

# Holitime App Information

## Summary
A Next.js application for time tracking and workforce management, named "Holitime". The app provides functionality for managing jobs, shifts, timesheets, and worker assignments with role-based access control. Features include avatar management, PDF generation, and CSV import/export capabilities.

## Structure
- **src/**: Main application code (components, hooks, features, app routes)
  - **app/**: Next.js App Router routes and API endpoints
  - **components/**: UI components including dashboards and admin interfaces
  - **lib/**: Utility functions, API clients, and service integrations
  - **hooks/**: Custom React hooks for state management and data fetching
  - **providers/**: React context providers for themes and data
- **prisma/**: Database schema and migrations using Prisma ORM
- **public/**: Static assets and files
- **tests/**: Test files for database, UI, and end-to-end testing
- **scripts/**: Utility scripts for deployment, database operations, and maintenance

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: TypeScript 5.5.4 targeting ES5
**Runtime**: Node.js 20.x
**Framework**: Next.js 14.2.30
**Build System**: Next.js build system with standalone output
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- Next.js (14.2.30) - React framework
- React (18.3.1) - UI library
- Prisma (5.17.0) - ORM for PostgreSQL
- NextAuth (4.24.11) - Authentication with PG adapter
- TanStack Query (5.51.15) - Data fetching and caching
- Mantine (7.11.1) & Radix UI - UI component libraries
- Tailwind CSS (3.4.7) - Utility-first CSS framework
- PDF generation: jspdf, pdf-lib, react-pdf
- Excel handling: exceljs, xlsx
- Google Cloud: @google-cloud/storage, @google-cloud/cloud-sql-connector
- Zod (3.23.8) - Schema validation
- Zustand (4.5.4) - State management

**Development Dependencies**:
- TypeScript (5.5.4)
- Jest (30.0.5) - Testing framework
- ESLint (8.57.0) - Linting
- Testing Library - Test utilities
- Faker - Test data generation

## Build & Installation
```bash
# Install dependencies
npm ci

# Development
npm run dev

# Build for production
npm run build

# Start production server
npm run start
npm run start:prod  # With database migration

# Database operations
npm run migrate       # Development migrations
npm run migrate:prod  # Production migrations
npm run db:seed       # Seed database
npm run studio        # Prisma Studio UI

# Deployment
npm run deploy        # Default deployment
npm run deploy:local  # Local deployment
npm run deploy:cloudbuild  # Deploy using Google Cloud Build
```

## Docker
**Dockerfile**: Multi-stage build process optimized for Next.js
**Base Image**: node:20-slim
**Build Process**:
1. deps: Install dependencies
2. builder: Generate Prisma client and build Next.js app
3. runner: Create production image with minimal footprint
**Configuration**: Configured for Google Cloud Run with PORT 8080
**Run Command**: `node start.js`

## Testing
**Framework**: Jest with Testing Library
**Test Location**: `/tests` directory with specialized test files
**Configuration**: jest.config.js with Next.js/Babel setup
**Test Types**:
- Database tests: `npm run test:db` (tests/database.test.js)
- UI functionality: `npm run test:ui` (tests/ui-functionality.test.js)
- End-to-end tests: `npm run test:e2e` (tests/e2e-comprehensive.test.js)
- Critical functionality: tests/critical-functionality.test.js
- All tests: `npm run test:all`

## Database
**ORM**: Prisma with PostgreSQL adapter
**Database**: PostgreSQL (Google Cloud SQL compatible)
**Schema**: Comprehensive data model in prisma/schema.prisma
**Models**: User, Company, Job, Shift, AssignedPersonnel, TimeEntry, Timesheet, Document, Notification
**Migrations**: Managed via Prisma Migrate with deployment scripts

## Deployment
**Platform**: Google Cloud Run (indicated by deployment scripts)
**CI/CD**: Uses cloudbuild.yaml for Google Cloud Build integration
**Environment**: Configuration via .env.production
**Scripts**: Multiple deployment options with PowerShell and Bash scripts
**Storage**: Google Cloud Storage for avatars and document storage