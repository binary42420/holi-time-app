// Standardized API route for users

import { usersApi } from '@/lib/api/standardized-endpoints';

// GET /api/v1/users - List users
export const GET = usersApi.list;