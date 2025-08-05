// Standardized API route for users

import { usersApi } from '@/lib/api/standardized-endpoints';

// Force dynamic rendering for this route since it uses authentication
export const dynamic = 'force-dynamic';

// GET /api/v1/users - List users
export const GET = usersApi.list;