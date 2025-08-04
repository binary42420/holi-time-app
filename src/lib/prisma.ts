import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Check if we're in build time (production without DATABASE_URL)
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

// Create a mock Prisma client for build time
const mockPrismaClient = {
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $queryRaw: () => Promise.resolve([]),
  $executeRaw: () => Promise.resolve(0),
  user: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  // Add other models as needed
} as any;

export const prisma = isBuildTime 
  ? mockPrismaClient
  : (global.prisma ||
    new PrismaClient({
      log: ['query'],
    }));

if (process.env.NODE_ENV !== 'production' && !isBuildTime) {
  global.prisma = prisma as PrismaClient;
}