import {
  Assignment,
  User,
  UserWithAssignments,
  CrewChiefPermission,
  ShiftWithDetails,
  Job,
  Company,
  TimesheetDetails,
  Notification,
  Announcement,
} from '@/lib/types';
import { RequestInit } from 'next/dist/server/web/spec-extension/request';

const API_BASE_URL = '/api';

async function fetchFromApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `API call failed: ${response.statusText}` }));
    throw new Error(errorData.error || `API call failed: ${response.statusText}`);
  }
  return response.json();
}

// --- API Service Definitions ---

export const apiService = {
  // Shifts
  getShift: (shiftId: string) => fetchFromApi<{ shift: ShiftWithDetails }>(`/shifts/${shiftId}`).then(data => data.shift),
  getShifts: (filters?: { date?: string; status?: string; companyId?: string; search?: string; jobId?: string; }) => {
    const params = new URLSearchParams();
    if (filters?.date && filters.date !== 'all') params.append('date', filters.date);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.companyId && filters.companyId !== 'all') params.append('companyId', filters.companyId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.jobId) params.append('jobId', filters.jobId);
    return fetchFromApi<{ shifts: ShiftWithDetails[] }>(`/shifts?${params.toString()}`).then(data => data.shifts);
  },
  getShiftAssignments: (shiftId: string) => fetchFromApi<{ assignments: Assignment[] }>(`/shifts/${shiftId}/assigned`).then(data => data.assignments),
  updateShiftNotes: (shiftId: string, notes: string) => fetchFromApi<void>(`/shifts/${shiftId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) }),
  assignWorker: (shiftId: string, userId: string, roleCode: string) => fetchFromApi<void>(`/shifts/${shiftId}/assign-worker`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, roleCode }) }),
  unassignWorker: (shiftId: string, assignmentId: string) => fetchFromApi<void>(`/shifts/${shiftId}/assigned/${assignmentId}`, { method: 'DELETE' }),
  clockIn: (shiftId: string, assignmentId: string) => fetchFromApi<void>(`/shifts/${shiftId}/assigned/${assignmentId}/clock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clock_in' }) }),
  clockOut: (shiftId: string, assignmentId: string) => fetchFromApi<void>(`/shifts/${shiftId}/assigned/${assignmentId}/clock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clock_out' }) }),
  endShift: (shiftId: string) => fetchFromApi<void>(`/shifts/${shiftId}/end-shift`, { method: 'POST' }),

  // Users & Employees
  getUsers: (params?: { page?: number; pageSize?: number; fetchAll?: boolean; role?: string; search?: string; status?: 'active' | 'inactive'; excludeCompanyUsers?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.fetchAll) searchParams.append('fetchAll', 'true');
    if (params?.role) searchParams.append('role', params.role);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.excludeCompanyUsers) searchParams.append('excludeCompanyUsers', 'true');
    return fetchFromApi<{ users: User[]; pagination: any }>(`/users?${searchParams.toString()}`);
  },
  getUserById: (id: string) => fetchFromApi<{ user: UserWithAssignments }>(`/users/${id}`).then(data => data.user),
  getAvailableEmployees: () => fetchFromApi<{ users: User[] }>('/users?role=Employee').then(data => data.users),

  // Crew Chief
  getCrewChiefPermissions: (shiftId: string) => fetchFromApi<{ permissions: CrewChiefPermission[] }>(`/crew-chief-permissions/manage?permissionType=shift&targetId=${shiftId}`).then(data => data.permissions),

  // Jobs
  getJobs: (filters?: { status?: string; companyId?: string; search?: string; sortBy?: string; }) => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.companyId && filters.companyId !== 'all') params.append('companyId', filters.companyId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    return fetchFromApi<{ jobs: Job[] }>(`/jobs?${params.toString()}`).then(data => data.jobs);
  },

  // Companies
  getCompanies: (filters?: { page?: number; pageSize?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters?.search) params.append('search', filters.search);
    return fetchFromApi<{ companies: Company[]; pagination: any }>(`/companies?${params.toString()}`);
  },
  getCompany: (id: string) => fetchFromApi<{ company: Company }>(`/companies/${id}`).then(data => data.company),

  // Timesheets
  getTimesheet: (id: string) => fetchFromApi<{ timesheet: TimesheetDetails }>(`/timesheets/${id}`).then(data => data.timesheet),
  getTimesheets: (filters?: { status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    return fetchFromApi<{ success: boolean; timesheets: TimesheetDetails[] }>(`/timesheets?${params.toString()}`).then(data => data.timesheets);
  },

  // Notifications
  getNotifications: () => fetchFromApi<{ notifications: Notification[] }>('/notifications').then(data => data.notifications),

  // Announcements
  getAnnouncements: () => fetchFromApi<{ announcements: Announcement[] }>('/announcements').then(data => data.announcements),

  // Dashboards
  getCompanyDashboard: (companyId: string) => fetchFromApi<any>(`/companies/${companyId}/dashboard`),
  getCrewChiefDashboard: (userId: string) => fetchFromApi<any>(`/crew-chief/${userId}/dashboard`),
  getEmployeeDashboard: (userId: string) => fetchFromApi<any>(`/employees/${userId}/dashboard`),
};

export type ApiService = typeof apiService;