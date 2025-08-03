'use client';

import JobCard from '@/components/JobCard';
import { Job } from '@/lib/types';

// Mock data to test completed shift functionality
const mockCompletedJob: Job = {
  id: 'test-job-1',
  name: 'Test Event Setup',
  description: 'Setting up for a test event',
  status: 'Active',
  startDate: new Date(),
  endDate: new Date(),
  location: 'Test Venue',
  budget: '$5000',
  notes: 'Test notes',
  isCompleted: false,
  companyId: 'test-company-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  company: {
    id: 'test-company-1',
    name: 'Test Company',
    company_logo_url: null,
    email: 'test@company.com',
    phone: '555-0123',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  shifts: [
    {
      id: 'test-shift-1',
      jobId: 'test-job-1',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      requestedWorkers: 5,
      status: 'Completed', // This is the completed shift
      location: 'Test Location',
      description: 'Test shift description',
      notes: 'Test shift notes',
      requiredCrewChiefs: 1,
      requiredStagehands: 2,
      requiredForkOperators: 1,
      requiredReachForkOperators: 0,
      requiredRiggers: 1,
      requiredGeneralLaborers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedPersonnel: [
        {
          id: 'test-assignment-1',
          shiftId: 'test-shift-1',
          userId: 'test-user-1',
          roleCode: 'CC',
          status: 'ShiftEnded',
          createdAt: new Date(),
          updatedAt: new Date(),
          timeEntries: [],
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@user.com',
            passwordHash: 'hash',
            role: 'Employee',
            companyId: null,
            isActive: true,
            crew_chief_eligible: true,
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      job: {
        id: 'test-job-1',
        name: 'Test Event Setup',
        description: 'Setting up for a test event',
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        location: 'Test Venue',
        budget: '$5000',
        notes: 'Test notes',
        isCompleted: false,
        companyId: 'test-company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'test-company-1',
          name: 'Test Company',
          company_logo_url: null,
          email: 'test@company.com',
          phone: '555-0123',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        shifts: [],
        requestedWorkers: 5,
      },
      timesheets: [
        {
          id: 'test-timesheet-1',
          status: 'PENDING_COMPANY_APPROVAL',
        },
      ],
    },
    {
      id: 'test-shift-2',
      jobId: 'test-job-1',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      requestedWorkers: 3,
      status: 'Active', // This is an active shift for comparison
      location: 'Test Location 2',
      description: 'Test shift description 2',
      notes: 'Test shift notes 2',
      requiredCrewChiefs: 1,
      requiredStagehands: 1,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 1,
      requiredGeneralLaborers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedPersonnel: [
        {
          id: 'test-assignment-2',
          shiftId: 'test-shift-2',
          userId: 'test-user-2',
          roleCode: 'SH',
          status: 'ClockedIn',
          createdAt: new Date(),
          updatedAt: new Date(),
          timeEntries: [],
          user: {
            id: 'test-user-2',
            name: 'Test User 2',
            email: 'test2@user.com',
            passwordHash: 'hash',
            role: 'Employee',
            companyId: null,
            isActive: true,
            crew_chief_eligible: false,
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      job: {
        id: 'test-job-1',
        name: 'Test Event Setup',
        description: 'Setting up for a test event',
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        location: 'Test Venue',
        budget: '$5000',
        notes: 'Test notes',
        isCompleted: false,
        companyId: 'test-company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'test-company-1',
          name: 'Test Company',
          company_logo_url: null,
          email: 'test@company.com',
          phone: '555-0123',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        shifts: [],
        requestedWorkers: 3,
      },
      timesheets: [],
    },
  ],
  recentShifts: [
    {
      id: 'test-shift-1',
      jobId: 'test-job-1',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      requestedWorkers: 5,
      status: 'Completed', // This is the completed shift
      location: 'Test Location',
      description: 'Test shift description',
      notes: 'Test shift notes',
      requiredCrewChiefs: 1,
      requiredStagehands: 2,
      requiredForkOperators: 1,
      requiredReachForkOperators: 0,
      requiredRiggers: 1,
      requiredGeneralLaborers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedPersonnel: [
        {
          id: 'test-assignment-1',
          shiftId: 'test-shift-1',
          userId: 'test-user-1',
          roleCode: 'CC',
          status: 'ShiftEnded',
          createdAt: new Date(),
          updatedAt: new Date(),
          timeEntries: [],
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@user.com',
            passwordHash: 'hash',
            role: 'Employee',
            companyId: null,
            isActive: true,
            crew_chief_eligible: true,
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      job: {
        id: 'test-job-1',
        name: 'Test Event Setup',
        description: 'Setting up for a test event',
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        location: 'Test Venue',
        budget: '$5000',
        notes: 'Test notes',
        isCompleted: false,
        companyId: 'test-company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'test-company-1',
          name: 'Test Company',
          company_logo_url: null,
          email: 'test@company.com',
          phone: '555-0123',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        shifts: [],
        requestedWorkers: 5,
      },
      timesheets: [
        {
          id: 'test-timesheet-1',
          status: 'PENDING_COMPANY_APPROVAL',
        },
      ],
    },
    {
      id: 'test-shift-2',
      jobId: 'test-job-1',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      requestedWorkers: 3,
      status: 'Active', // This is an active shift for comparison
      location: 'Test Location 2',
      description: 'Test shift description 2',
      notes: 'Test shift notes 2',
      requiredCrewChiefs: 1,
      requiredStagehands: 1,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 1,
      requiredGeneralLaborers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedPersonnel: [
        {
          id: 'test-assignment-2',
          shiftId: 'test-shift-2',
          userId: 'test-user-2',
          roleCode: 'SH',
          status: 'ClockedIn',
          createdAt: new Date(),
          updatedAt: new Date(),
          timeEntries: [],
          user: {
            id: 'test-user-2',
            name: 'Test User 2',
            email: 'test2@user.com',
            passwordHash: 'hash',
            role: 'Employee',
            companyId: null,
            isActive: true,
            crew_chief_eligible: false,
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      job: {
        id: 'test-job-1',
        name: 'Test Event Setup',
        description: 'Setting up for a test event',
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        location: 'Test Venue',
        budget: '$5000',
        notes: 'Test notes',
        isCompleted: false,
        companyId: 'test-company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'test-company-1',
          name: 'Test Company',
          company_logo_url: null,
          email: 'test@company.com',
          phone: '555-0123',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        shifts: [],
        requestedWorkers: 3,
      },
      timesheets: [],
    },
  ],
  requestedWorkers: 8,
};

export default function TestCompletedShiftPage() {
  const handleView = (job: Job) => {
    console.log('View job:', job.id);
  };

  const handleEdit = (job: Job) => {
    console.log('Edit job:', job.id);
  };

  const handleDelete = (job: Job) => {
    console.log('Delete job:', job.id);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Completed Shift Functionality</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Job with Mixed Shift Statuses</h2>
            <p className="text-gray-400 mb-4">
              This demonstrates how completed shifts appear with green background and timesheet badge,
              while active shifts show the normal worker count badge.
            </p>
            <JobCard 
              job={mockCompletedJob} 
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Expected Behavior:</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✅ <strong>Completed Shift (First shift):</strong> Green background, timesheet badge with status</li>
              <li>✅ <strong>Active Shift (Second shift):</strong> Normal background, worker count badge (1/3)</li>
              <li>✅ <strong>Timesheet Link:</strong> Clicking the timesheet badge should navigate to /timesheets/test-timesheet-1</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}