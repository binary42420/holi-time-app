// Standardized API route for shifts

import { shiftsApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this route since it uses authentication
export const dynamic = 'force-dynamic';

// GET /api/v1/shifts - List shifts
export const GET = shiftsApi.list;

// POST /api/v1/shifts - Create shift
export const POST = shiftsApi.create;