// Standardized API route for shifts

import { shiftsApi } from '@/lib/api/standardized-endpoints';

// GET /api/v1/shifts - List shifts
export const GET = shiftsApi.list;

// POST /api/v1/shifts - Create shift
export const POST = shiftsApi.create;