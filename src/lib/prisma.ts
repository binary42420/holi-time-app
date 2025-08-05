import { PrismaClient } from '@prisma/client'
import { isBuildTime } from './build-time-check'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

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

const buildTime = isBuildTime();

export const prisma = buildTime 
  ? mockPrismaClient
  : (global.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // Enhanced connection pooling configuration
      __internal: {
        engine: {
          // Connection pool settings
          connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10'),
          poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000'),
          // Query optimization
          queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
        }
      }
    }));

if (process.env.NODE_ENV !== 'production' && !buildTime) {
  global.prisma = prisma as PrismaClient;
}