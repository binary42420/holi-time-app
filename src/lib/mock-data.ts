import type { Company, Job, Shift, User, UserRole } from '@prisma/client';

export const mockUsers: Record<UserRole, User> = {
  Staff: { id: 'staff1', name: 'Staff User', email: 'staff@handson.com', role: 'Staff', passwordHash: 'hashedpassword', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLogin: null, certifications: [], performance: null, location: null, companyId: null, avatarUrl: null },
  Admin: { id: 'adm1', name: 'Admin User', email: 'admin@handson.com', role: 'Admin', passwordHash: 'hashedpassword', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLogin: null, certifications: [], performance: null, location: null, companyId: null, avatarUrl: null },
  CompanyUser: { id: 'cli-user1', name: 'John Smith', email: 'jsmith@constructo.com', role: 'CompanyUser', companyId: 'cli1', passwordHash: 'hashedpassword', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLogin: null, certifications: [], performance: null, location: null, avatarUrl: null },
  CrewChief: { id: 'cc1', name: 'Maria Garcia', email: 'maria.g@handson.com', role: 'CrewChief', passwordHash: 'hashedpassword', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLogin: null, certifications: [], performance: null, location: null, companyId: null, avatarUrl: null },
  Employee: { id: 'emp2', name: 'Maria Garcia', email: 'maria.g@handson.com', role: 'Employee', passwordHash: 'hashedpassword', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLogin: null, certifications: [], performance: null, location: null, companyId: null, avatarUrl: null },
};
