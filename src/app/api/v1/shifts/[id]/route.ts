// Standardized API route for individual shifts

import { shiftsApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this route since it uses authentication
export const dynamic = 'force-dynamic';

// GET /api/v1/shifts/[id] - Get shift by ID
export const GET = shiftsApi.getById;

// PUT /api/v1/shifts/[id] - Update shift
export const PUT = shiftsApi.update;

// DELETE /api/v1/shifts/[id] - Delete shift
export const DELETE = shiftsApi.delete;