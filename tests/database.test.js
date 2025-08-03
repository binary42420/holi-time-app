/**
 * Database Schema and Query Validation Tests
 * Validates Prisma schema integrity and database queries
 */

const { prisma } = require('../src/lib/prisma');

describe('Database Schema Validation', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should connect to database successfully', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result[0].test).toBe(1);
  });

  test('should validate all required tables exist', async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const requiredTables = [
      'announcements',
      'assigned_personnel',
      'companies',
      'crew_chief_permissions',
      'jobs',
      'notifications',
      'password_reset_tokens',
      'shifts',
      'time_entries',
      'timesheets',
      'users'
    ];
    
    const tableNames = tables.map(t => t.table_name);
    
    requiredTables.forEach(table => {
      expect(tableNames).toContain(table);
    });
  });

  test('should validate user table structure', async () => {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    const requiredColumns = [
      'id', 'name', 'email', 'passwordHash', 'role', 'avatarUrl',
      'isActive', 'crew_chief_eligible', 'fork_operator_eligible',
      'certifications', 'performance', 'location', 'companyId'
    ];
    
    const columnNames = columns.map(c => c.column_name);
    
    requiredColumns.forEach(column => {
      expect(columnNames).toContain(column);
    });
  });

  test('should validate shift table structure', async () => {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'shifts'
      ORDER BY ordinal_position
    `;
    
    const requiredColumns = [
      'id', 'jobId', 'date', 'startTime', 'endTime', 'requestedWorkers',
      'status', 'location', 'description', 'notes', 'requiredCrewChiefs',
      'requiredStagehands', 'requiredForkOperators', 'requiredReachForkOperators',
      'requiredRiggers', 'requiredGeneralLaborers', 'createdAt', 'updatedAt'
    ];
    
    const columnNames = columns.map(c => c.column_name);
    
    requiredColumns.forEach(column => {
      expect(columnNames).toContain(column);
    });
  });

  test('should validate foreign key relationships', async () => {
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;
    
    // Verify key relationships exist
    const relationships = [
      { table: 'shifts', column: 'jobId', foreign_table: 'jobs' },
      { table: 'assigned_personnel', column: 'shiftId', foreign_table: 'shifts' },
      { table: 'assigned_personnel', column: 'userId', foreign_table: 'users' },
      { table: 'time_entries', column: 'assignedPersonnelId', foreign_table: 'assigned_personnel' },
      { table: 'jobs', column: 'companyId', foreign_table: 'companies' }
    ];
    
    relationships.forEach(rel => {
      const found = constraints.find(c => 
        c.table_name === rel.table && 
        c.column_name === rel.column &&
        c.foreign_table_name === rel.foreign_table
      );
      expect(found).toBeDefined();
    });
  });

  test('should validate enum values', async () => {
    // Test UserRole enum
    const userRoles = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"UserRole")) as role
    `;
    
    const expectedRoles = ['Staff', 'Admin', 'CompanyUser', 'CrewChief', 'Employee'];
    const actualRoles = userRoles.map(r => r.role);
    
    expectedRoles.forEach(role => {
      expect(actualRoles).toContain(role);
    });

    // Test ShiftStatus enum
    const shiftStatuses = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"ShiftStatus")) as status
    `;
    
    const expectedStatuses = ['Pending', 'Active', 'InProgress', 'Completed', 'Cancelled'];
    const actualStatuses = shiftStatuses.map(s => s.status);
    
    expectedStatuses.forEach(status => {
      expect(actualStatuses).toContain(status);
    });
  });
});

describe('Database Query Validation', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should execute user queries without errors', async () => {
    const queries = [
      // Basic user query
      () => prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        },
        take: 5
      }),
      
      // User with company
      () => prisma.user.findMany({
        include: {
          company: true
        },
        take: 5
      }),
      
      // User with assignments
      () => prisma.user.findMany({
        include: {
          assignments: {
            include: {
              shift: true
            }
          }
        },
        take: 5
      })
    ];

    for (const query of queries) {
      await expect(query()).resolves.not.toThrow();
    }
  });

  test('should execute shift queries without errors', async () => {
    const queries = [
      // Basic shift query
      () => prisma.shift.findMany({
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true
        },
        take: 5
      }),
      
      // Shift with job and company
      () => prisma.shift.findMany({
        include: {
          job: {
            include: {
              company: true
            }
          }
        },
        take: 5
      }),
      
      // Shift with assignments and users
      () => prisma.shift.findMany({
        include: {
          assignedPersonnel: {
            include: {
              user: true,
              timeEntries: true
            }
          }
        },
        take: 5
      })
    ];

    for (const query of queries) {
      await expect(query()).resolves.not.toThrow();
    }
  });

  test('should execute job queries without errors', async () => {
    const queries = [
      // Basic job query
      () => prisma.job.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          companyId: true
        },
        take: 5
      }),
      
      // Job with company and shifts
      () => prisma.job.findMany({
        include: {
          company: true,
          shifts: {
            include: {
              assignedPersonnel: {
                include: {
                  user: true
                }
              }
            },
            orderBy: {
              date: 'desc'
            },
            take: 3
          }
        },
        take: 5
      })
    ];

    for (const query of queries) {
      await expect(query()).resolves.not.toThrow();
    }
  });

  test('should execute assignment queries without errors', async () => {
    const queries = [
      // Basic assignment query
      () => prisma.assignedPersonnel.findMany({
        select: {
          id: true,
          roleCode: true,
          status: true,
          userId: true,
          shiftId: true
        },
        take: 5
      }),
      
      // Assignment with user and shift
      () => prisma.assignedPersonnel.findMany({
        include: {
          user: true,
          shift: {
            include: {
              job: true
            }
          },
          timeEntries: true
        },
        take: 5
      })
    ];

    for (const query of queries) {
      await expect(query()).resolves.not.toThrow();
    }
  });

  

  
});

describe('Performance Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should execute complex queries within reasonable time', async () => {
    const start = Date.now();
    
    await prisma.shift.findMany({
      include: {
        job: {
          include: {
            company: true
          }
        },
        assignedPersonnel: {
          include: {
            user: true,
            timeEntries: true
          }
        }
      },
      take: 50
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should handle concurrent queries', async () => {
    const queries = Array(5).fill().map(() => 
      prisma.user.findMany({ take: 10 })
    );

    const results = await Promise.allSettled(queries);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBe(5); // All queries should succeed
  });
});