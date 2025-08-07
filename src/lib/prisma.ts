import { PrismaClient } from '@prisma/client'
import { isBuildTime } from './build-time-check'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Create a comprehensive mock Prisma client for build time
const createMockModel = () => ({
  findMany: () => Promise.resolve([]),
  findUnique: () => Promise.resolve(null),
  findFirst: () => Promise.resolve(null),
  create: () => Promise.resolve({}),
  createMany: () => Promise.resolve({ count: 0 }),
  update: () => Promise.resolve({}),
  updateMany: () => Promise.resolve({ count: 0 }),
  upsert: () => Promise.resolve({}),
  delete: () => Promise.resolve({}),
  deleteMany: () => Promise.resolve({ count: 0 }),
  count: () => Promise.resolve(0),
  aggregate: () => Promise.resolve({}),
  groupBy: () => Promise.resolve([]),
});

const mockPrismaClient = {
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $queryRaw: () => Promise.resolve([]),
  $executeRaw: () => Promise.resolve(0),
  $transaction: () => Promise.resolve([]),
  user: createMockModel(),
  company: createMockModel(),
  job: createMockModel(),
  shift: createMockModel(),
  assignedPersonnel: createMockModel(),
  timeEntry: createMockModel(),
  timesheet: createMockModel(),
  document: createMockModel(),
  notification: createMockModel(),
  workerRequirement: createMockModel(),
} as unknown as PrismaClient;

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
      }
    }));

if (process.env.NODE_ENV !== 'production' && !buildTime) {
  global.prisma = prisma as PrismaClient;
}