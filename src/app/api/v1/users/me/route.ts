// Standardized API route for current user

import { usersApi } from '@/lib/api/standardized-endpoints';

// GET /api/v1/users/me - Get current user
export const GET = usersApi.getCurrentUser;