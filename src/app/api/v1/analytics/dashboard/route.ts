// Standardized API route for analytics dashboard

import { analyticsApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/v1/analytics/dashboard - Get dashboard analytics
export const GET = analyticsApi.dashboard;