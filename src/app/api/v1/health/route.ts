// Standardized API route for health check

import { healthApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/v1/health - Health check
export const GET = healthApi.check;