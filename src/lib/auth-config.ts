import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@/lib/types';
import { isBuildTime } from './build-time-check';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Skip database operations during build time
        if (isBuildTime()) {
          return null;
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          // If user doesn't exist or has no password (is an OAuth user), deny login.
          if (!user || !user.passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.passwordHash
          );

          if (!isPasswordValid) {
            return null;
          }

          // Return a fully compliant User object.
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId ?? undefined,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          console.error('Credentials provided:', { 
            email: credentials.email, 
            hasPassword: !!credentials.password 
          });
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Skip database operations during build time
      if (isBuildTime()) {
        return true;
      }

      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              avatarData: true, // Only needed for updating avatar
              // Exclude other large fields
            }
          });

          if (existingUser) {
            // Check if user is active
            if (!existingUser.isActive) {
              return false;
            }

            await prisma.user.update({
              where: { email: user.email! },
              data: {
                name: user.name || existingUser.name,
                avatarData: user.image || existingUser.avatarData,
              }
            });
            
            return true;
          } else {
            // Create new user from Google profile (no password hash needed for OAuth users)
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || '',
                avatarData: user.image,
                role: UserRole.Employee, // Default role for Google sign-ups
                // Note: No passwordHash for OAuth users (field is now optional)
              }
            });
            return true;
          }
        } catch (error) {
          console.error('Error during Google sign-in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // This block runs on initial sign-in.
      if (user) {
        // For OAuth providers, we need to fetch the user from the database
        // because the user object from OAuth doesn't have our custom fields
        if (account?.provider === 'google') {
          const { getUserBasicByEmail } = await import('./user-queries');
          const dbUser = await getUserBasicByEmail(user.email!);
          
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.email = dbUser.email;
            

            if (dbUser.companyId) {
              token.companyId = dbUser.companyId;
            }
          }
        } else {
          // For credentials login, use the user object directly
          token.id = user.id;
          token.role = user.role;
          if (user.companyId) {
            token.companyId = user.companyId;
          }
        }
      }
      // This block runs on subsequent JWT requests (e.g., page navigation).
      // Only refresh user data periodically to reduce database load
      else if (token.email && !isBuildTime()) {
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = token.lastRefresh as number || 0;
        const refreshInterval = 5 * 60; // 5 minutes
        
        // Only refresh if it's been more than 5 minutes since last refresh
        if (now - lastRefresh > refreshInterval) {
          const { getUserBasicByEmail } = await import('./user-queries');
          const dbUser = await getUserBasicByEmail(token.email);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.lastRefresh = now;
            

            if (dbUser.companyId) {
              token.companyId = dbUser.companyId;
            }
          }
        }
      }
      // Monitor JWT token size to help debug large session data issues
      if (process.env.NODE_ENV === 'development') {
        const tokenSize = JSON.stringify(token).length;
        if (tokenSize > 4096) { // 4KB threshold
          console.warn(`⚠️  Large JWT token detected: ${tokenSize} bytes`);
          console.warn('Token contents:', Object.keys(token));
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // This is now fully type-safe thanks to the next-auth.d.ts file.
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;


        if (token.companyId) {
          session.user.companyId = token.companyId;
        }
      }
      
      // Monitor session size to help debug large session data issues
      if (process.env.NODE_ENV === 'development') {
        const sessionSize = JSON.stringify(session).length;
        if (sessionSize > 4096) { // 4KB threshold
          console.warn(`⚠️  Large session detected: ${sessionSize} bytes`);
          console.warn('Session user keys:', Object.keys(session.user));
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login page on error
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata);
      }
    }
  }
};