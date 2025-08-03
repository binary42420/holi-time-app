---
description: Repository Information Overview
alwaysApply: true
---

# Holitime App Information

## Summary
A Next.js application for time tracking and workforce management, named "Holitime". The app provides functionality for managing jobs, shifts, timesheets, and worker assignments with role-based access control.

## Structure
- **src/**: Main application code (components, hooks, features, app routes)
- **prisma/**: Database schema and migrations using Prisma ORM
- **public/**: Static assets and files
- **tests/**: Test files for database, UI, and end-to-end testing
- **scripts/**: Utility scripts for deployment, database operations, and maintenance

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: ES2017 target with Next.js 14
**Build System**: Next.js build system
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- Next.js (14.2.30) - React framework
- React (18.3.1) - UI library
- Prisma (5.17.0) - ORM for PostgreSQL
- NextAuth (4.24.7) - Authentication
- TanStack Query (5.51.15) - Data fetching
- Mantine (7.11.1) & Radix UI - UI components
- Tailwind CSS (3.4.7) - Styling
- Zod (3.23.8) - Schema validation
- Zustand (4.5.4) - State management

**Development Dependencies**:
- TypeScript (5.5.4)
- Jest (30.0.5) - Testing
- ESLint (8.57.0) - Linting
- Testing Library - Test utilities
- Faker - Test data generation

## Build & Installation
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Database operations
npm run migrate       # Development migrations
npm run migrate:prod  # Production migrations
npm run db:seed       # Seed database
npm run studio        # Prisma Studio UI
```

## Docker
**Dockerfile**: Multi-stage build process
**Base Image**: node:20-slim
**Build Process**:
1. Builder stage installs dependencies and builds the application
2. Runtime stage copies only necessary files for production
**Run Command**: `node server.js`

## Testing
**Framework**: Jest with Testing Library
**Test Location**: `/tests` directory
**Configuration**: jest.config.js and jest.setup.js
**Test Types**:
- Database tests: `npm run test:db`
- UI functionality: `npm run test:ui`
- End-to-end tests: `npm run test:e2e`
- All tests: `npm run test:all`

## Database
**ORM**: Prisma
**Database**: PostgreSQL
**Schema**: Comprehensive data model for users, companies, jobs, shifts, timesheets
**Models**: User, Company, Job, Shift, AssignedPersonnel, TimeEntry, Timesheet