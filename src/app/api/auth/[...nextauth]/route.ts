// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// 1. Call NextAuth once with your configuration.
//    This creates the handler function for you.
const handler = NextAuth(authOptions)

// 2. Export the handler for both GET and POST requests.
export { handler as GET, handler as POST }