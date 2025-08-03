import { Shift, Assignment, User, CrewChiefPermission, RoleCode, ShiftWithDetails } from '@/lib/types';
import { RequestInit } from 'next/dist/server/web/spec-extension/request';

// Client-side API fetching functions
const API_BASE_URL = '/api';

async function fetchFromApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  return response.json();
}

export const getShift = (shiftId: string): Promise<ShiftWithDetails> => fetchFromApi<{shift: ShiftWithDetails}>(`/shifts/${shiftId}`).then(data => data.shift);
export const getShiftAssignments = (shiftId: string): Promise<Assignment[]> => fetchFromApi<{assignments: Assignment[]}>(`/shifts/${shiftId}/assigned`).then(data => data.assignments);
export const getAvailableEmployees = (): Promise<User[]> => fetchFromApi('/users?role=Employee');
export const getCrewChiefPermissions = (shiftId: string): Promise<CrewChiefPermission[]> => fetchFromApi<{permissions: CrewChiefPermission[]}>(`/crew-chief-permissions/manage?permissionType=shift&targetId=${shiftId}`).then(data => data.permissions);
export const updateShiftNotes = (shiftId: string, notes: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes }),
});
export const assignWorker = (shiftId: string, employeeId: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}/assign-worker`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ employeeId }),
});
export const unassignWorker = (shiftId: string, assignmentId: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}/assigned/${assignmentId}`, {
  method: 'DELETE',
});
export const clockIn = (shiftId: string, assignmentId: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'clock_in' }),
});
export const clockOut = (shiftId: string, assignmentId: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'clock_out' }),
});

export const endShift = (shiftId: string): Promise<void> => fetchFromApi(`/shifts/${shiftId}/end-shift`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
export const updateWorkerRequirements = (shiftId: string, requirements: { roleCode: RoleCode; requiredCount: number }[]): Promise<void> => fetchFromApi(`/shifts/${shiftId}/worker-requirements`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ requirements }),
});

// Server-side data access functions have been moved to their respective API routes.
