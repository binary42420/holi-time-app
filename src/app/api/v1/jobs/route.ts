// Standardized API route for jobs

import { jobsApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this route since it uses authentication
export const dynamic = 'force-dynamic';

// GET /api/v1/jobs - List jobs
export const GET = jobsApi.list;

// POST /api/v1/jobs - Create job
export const POST = jobsApi.create;