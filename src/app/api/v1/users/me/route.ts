// Standardized API route for current user

import { usersApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this route since it uses authentication
export const dynamic = 'force-dynamic';

// GET /api/v1/users/me - Get current user
export const GET = usersApi.getCurrentUser;