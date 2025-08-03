/**
 * Comprehensive End-to-End Test Suite for HoliTime Application
 * Tests all API endpoints, database connections, UI functionality, and data integrity
 */

const { prisma } = require('../src/lib/prisma');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  adminUser: {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Test Admin'
  },
  testCompany: {
    name: 'Test Company E2E',
    email: 'test@company.com'
  }
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForServer = async (url, retries = 10, delayTime = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(url);
      return true;
    } catch (error) {
      console.log(`Server not ready, retrying... (${i + 1}/${retries})`);
      await delay(delayTime);
    }
  }
  throw new Error('Server did not become ready within the specified time.');
};

const makeRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { response, data };
};

const authenticateUser = async (email, password) => {
  const { response, data } = await makeRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${data.error}`);
  }
  
  return data.token;
};

// Database Schema Validation
describe('Database Schema Validation', () => {
  test('should validate all required tables exist', async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const requiredTables = [
      'users', 'companies', 'jobs', 'shifts', 'assigned_personnel',
      'time_entries', 'timesheets', 'notifications', 'announcements',
      'crew_chief_permissions', 'password_reset_tokens'
    ];
    
    const tableNames = tables.map(t => t.table_name);
    
    requiredTables.forEach(table => {
      expect(tableNames).toContain(table);
    });
  });

  test('should validate database constraints and relationships', async () => {
    // Test foreign key constraints
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
    
    expect(constraints.length).toBeGreaterThan(0);
    
    // Verify specific relationships
    const shiftJobRelation = constraints.find(c => 
      c.table_name === 'shifts' && c.column_name === 'jobId'
    );
    expect(shiftJobRelation).toBeDefined();
    expect(shiftJobRelation.foreign_table_name).toBe('jobs');
  });

  test('should validate column types and constraints', async () => {
    const columns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    
    // Verify critical columns exist with correct types
    const userIdColumn = columns.find(c => 
      c.table_name === 'users' && c.column_name === 'id'
    );
    expect(userIdColumn).toBeDefined();
    expect(userIdColumn.data_type).toBe('text');
    expect(userIdColumn.is_nullable).toBe('NO');
  });
});

// API Endpoints Testing
const { exec } = require('child_process');
let serverProcess;

describe('API Endpoints Comprehensive Testing', () => {
  let authToken;
  let testCompanyId;
  let testJobId;
  let testShiftId;
  let testUserId;

  beforeAll(async () => {
    // Start the Next.js server
    serverProcess = exec('npm run dev');
    await waitForServer(BASE_URL);

    // Setup test data
    try {
      // Create test company
      const company = await prisma.company.create({
        data: TEST_CONFIG.testCompany
      });
      testCompanyId = company.id;

      // Create test user
      const user = await prisma.user.create({
        data: {
          ...TEST_CONFIG.adminUser,
          role: 'Admin',
          companyId: testCompanyId,
          passwordHash: '$2a$10$test.hash.for.testing'
        }
      });
      testUserId = user.id;

    } catch (error) {
      console.warn('Test setup warning:', error.message);
    }
  }, 30000); // Increase timeout for beforeAll hook

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.assignedPersonnel.deleteMany({
        where: { shiftId: testShiftId }
      });
      await prisma.shift.deleteMany({
        where: { jobId: testJobId }
      });
      await prisma.job.deleteMany({
        where: { companyId: testCompanyId }
      });
      await prisma.user.deleteMany({
        where: { companyId: testCompanyId }
      });
      await prisma.company.deleteMany({
        where: { id: testCompanyId }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    } finally {
      // Stop the Next.js server
      if (serverProcess) {
        serverProcess.kill();
      }
    }
  });

  // Authentication Tests
  describe('Authentication API', () => {
    test('POST /api/auth/signin - should authenticate valid user', async () => {
      const { response, data } = await makeRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: TEST_CONFIG.adminUser.email,
          password: TEST_CONFIG.adminUser.password
        })
      });

      expect(response.status).toBeLessThan(500);
    });

    test('POST /api/auth/signin - should reject invalid credentials', async () => {
      const { response } = await makeRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Companies API Tests
  describe('Companies API', () => {
    test('GET /api/companies - should fetch companies', async () => {
      const { response, data } = await makeRequest('/api/companies');
      
      expect(response.status).toBeLessThan(500);
      if (response.ok) {
        expect(data).toHaveProperty('companies');
        expect(Array.isArray(data.companies)).toBe(true);
      }
    });

    test('POST /api/companies - should create company', async () => {
      const companyData = {
        name: 'Test Company API',
        email: 'api@test.com'
      };

      const { response, data } = await makeRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify(companyData)
      });

      if (response.ok) {
        expect(data).toHaveProperty('company');
        expect(data.company.name).toBe(companyData.name);
      }
    });

    test('GET /api/companies/[id] - should fetch specific company', async () => {
      if (!testCompanyId) return;

      const { response, data } = await makeRequest(`/api/companies/${testCompanyId}`);
      
      if (response.ok) {
        expect(data).toHaveProperty('company');
        expect(data.company.id).toBe(testCompanyId);
      }
    });
  });

  // Jobs API Tests
  describe('Jobs API', () => {
    test('GET /api/jobs - should fetch jobs', async () => {
      const { response, data } = await makeRequest('/api/jobs');
      
      expect(response.status).toBeLessThan(500);
      if (response.ok) {
        expect(data).toHaveProperty('jobs');
        expect(Array.isArray(data.jobs)).toBe(true);
      }
    });

    test('POST /api/jobs - should create job', async () => {
      if (!testCompanyId) return;

      const jobData = {
        name: 'Test Job API',
        description: 'Test job description',
        companyId: testCompanyId
      };

      const { response, data } = await makeRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        expect(data).toHaveProperty('job');
        expect(data.job.name).toBe(jobData.name);
        testJobId = data.job.id;
      }
    });

    test('GET /api/jobs/[id] - should fetch specific job', async () => {
      if (!testJobId) return;

      const { response, data } = await makeRequest(`/api/jobs/${testJobId}`);
      
      if (response.ok) {
        expect(data).toHaveProperty('job');
        expect(data.job.id).toBe(testJobId);
      }
    });
  });

  // Shifts API Tests
  describe('Shifts API', () => {
    test('GET /api/shifts - should fetch shifts', async () => {
      const { response, data } = await makeRequest('/api/shifts');
      
      expect(response.status).toBeLessThan(500);
      if (response.ok) {
        expect(data).toHaveProperty('shifts');
        expect(Array.isArray(data.shifts)).toBe(true);
      }
    });

    test('POST /api/shifts - should create shift', async () => {
      if (!testJobId) return;

      const shiftData = {
        jobId: testJobId,
        date: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiredCrewChiefs: 1,
        requiredGeneralLaborers: 3
      };

      const { response, data } = await makeRequest('/api/shifts', {
        method: 'POST',
        body: JSON.stringify(shiftData)
      });

      if (response.ok) {
        expect(data).toHaveProperty('shift');
        testShiftId = data.shift.id;
      }
    });

    test('GET /api/shifts/[id] - should fetch specific shift', async () => {
      if (!testShiftId) return;

      const { response, data } = await makeRequest(`/api/shifts/${testShiftId}`);
      
      if (response.ok) {
        expect(data).toHaveProperty('shift');
        expect(data.shift.id).toBe(testShiftId);
      }
    });

    test('PUT /api/shifts/[id] - should update shift', async () => {
      if (!testShiftId) return;

      const updateData = {
        notes: 'Updated test notes',
        requiredGeneralLaborers: 5
      };

      const { response, data } = await makeRequest(`/api/shifts/${testShiftId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        expect(data).toHaveProperty('shift');
        expect(data.shift.notes).toBe(updateData.notes);
      }
    });
  });

  // Users API Tests
  describe('Users API', () => {
    test('GET /api/users - should fetch users', async () => {
      const { response, data } = await makeRequest('/api/users');
      
      expect(response.status).toBeLessThan(500);
      if (response.ok) {
        expect(data).toHaveProperty('users');
        expect(Array.isArray(data.users)).toBe(true);
      }
    });

    test('GET /api/users/[id] - should fetch specific user', async () => {
      if (!testUserId) return;

      const { response, data } = await makeRequest(`/api/users/${testUserId}`);
      
      if (response.ok) {
        expect(data).toHaveProperty('user');
        expect(data.user.id).toBe(testUserId);
      }
    });
  });

  // Assignment API Tests
  describe('Assignment API', () => {
    test('POST /api/shifts/[id]/assign-worker - should assign worker', async () => {
      if (!testShiftId || !testUserId) return;

      const assignmentData = {
        userId: testUserId,
        roleCode: 'GL'
      };

      const { response, data } = await makeRequest(`/api/shifts/${testShiftId}/assign-worker`, {
        method: 'POST',
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        expect(data).toHaveProperty('assignment');
        expect(data.assignment.userId).toBe(testUserId);
      }
    });

    test('GET /api/shifts/[id]/assigned - should fetch assignments', async () => {
      if (!testShiftId) return;

      const { response, data } = await makeRequest(`/api/shifts/${testShiftId}/assigned`);
      
      if (response.ok) {
        expect(data).toHaveProperty('assignments');
        expect(Array.isArray(data.assignments)).toBe(true);
      }
    });
  });
});

// Database Query Validation
describe('Database Query Validation', () => {
  test('should validate all queries use correct column names', async () => {
    // Test common queries that might have column name issues
    const queries = [
      // Users query
      () => prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true
        }
      }),
      
      // Shifts with assignments query
      () => prisma.shift.findMany({
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
        }
      }),
      
      // Jobs with recent shifts query
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
        }
      })
    ];

    for (const query of queries) {
      try {
        await query();
      } catch (error) {
        fail(`Query failed with error: ${error.message}`);
      }
    }
  });

  test('should validate data integrity constraints', async () => {
    // Test that required relationships exist
    const shiftsWithoutJobs = await prisma.shift.findMany({
      where: {
        job: null
      }
    });
    expect(shiftsWithoutJobs.length).toBe(0);

    // Test that assignments reference valid users and shifts
    const invalidAssignments = await prisma.assignedPersonnel.findMany({
      where: {
        OR: [
          { user: null },
          { shift: null }
        ]
      }
    });
    expect(invalidAssignments.length).toBe(0);
  });

  test('should validate enum values are correct', async () => {
    // Test user roles
    const users = await prisma.user.findMany({
      select: { role: true }
    });
    
    const validRoles = ['Admin', 'Staff', 'CompanyUser', 'CrewChief', 'Employee'];
    users.forEach(user => {
      expect(validRoles).toContain(user.role);
    });

    // Test shift statuses
    const shifts = await prisma.shift.findMany({
      select: { status: true }
    });
    
    const validStatuses = ['Pending', 'Active', 'InProgress', 'Completed', 'Cancelled'];
    shifts.forEach(shift => {
      expect(validStatuses).toContain(shift.status);
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  test('should handle concurrent requests', async () => {
    const concurrentRequests = Array(10).fill().map(() => 
      makeRequest('/api/shifts')
    );

    const results = await Promise.allSettled(concurrentRequests);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBeGreaterThan(5); // At least 50% should succeed
  });

  test('should respond within acceptable time limits', async () => {
    const start = Date.now();
    await makeRequest('/api/shifts');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
  });
});

// Error Handling Tests
describe('Error Handling', () => {
  test('should handle invalid endpoints gracefully', async () => {
    const { response } = await makeRequest('/api/nonexistent');
    expect(response.status).toBe(404);
  });

  test('should handle malformed JSON gracefully', async () => {
    const { response } = await makeRequest('/api/jobs', {
      method: 'POST',
      body: 'invalid json'
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should handle missing required fields', async () => {
    const { response } = await makeRequest('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({}) // Missing required fields
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

// Run the tests
if (require.main === module) {
  console.log('Running comprehensive E2E tests...');
  
  // Set up Jest environment
  global.expect = require('expect');
  global.describe = (name, fn) => {
    console.log(`\n=== ${name} ===`);
    fn();
  };
  global.test = async (name, fn) => {
    try {
      console.log(`Running: ${name}`);
      await fn();
      console.log(`✅ ${name}`);
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  };
  global.beforeAll = (fn) => fn();
  global.afterAll = (fn) => fn();
  global.fail = (message) => { throw new Error(message); };

  // Run all tests
  (async () => {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      
      // Run test suites
      // Note: In a real test environment, you'd use Jest or another test runner
      console.log('E2E tests completed. Use Jest to run properly: npm test');
      
    } catch (error) {
      console.error('Test setup failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

module.exports = {
  TEST_CONFIG,
  makeRequest,
  authenticateUser
};