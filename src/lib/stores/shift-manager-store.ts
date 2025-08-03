import { create } from 'zustand';
import { AssignedPersonnel } from '@/lib/types';

interface ShiftManagerState {
  assignedPersonnel: AssignedPersonnel[];
  setAssignedPersonnel: (personnel: AssignedPersonnel[]) => void;

  isProcessing: boolean;
  lastAction?: string;
  performAction: <T>(action: () => Promise<T>, actionName: string) => Promise<T>;

  timesheetStatus: string | null;
  timesheetId: string | null;
  fetchTimesheetStatus: (shiftId: string) => Promise<void>;
}

export const useShiftManagerStore = create<ShiftManagerState>((set, get) => ({
  assignedPersonnel: [],
  setAssignedPersonnel: (personnel) => set({ assignedPersonnel: personnel }),

  isProcessing: false,
  lastAction: undefined,
  performAction: async (action, actionName) => {
    set({ isProcessing: true, lastAction: actionName });
    try {
      const result = await action();
      return result;
    } finally {
      set({ isProcessing: false, lastAction: undefined });
    }
  },

  timesheetStatus: null,
  timesheetId: null,
  fetchTimesheetStatus: async (shiftId: string) => {
    try {
      const response = await fetch(`/api/timesheets?shiftId=${shiftId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.timesheets && data.timesheets.length > 0) {
          const timesheet = data.timesheets[0];
          set({ timesheetStatus: timesheet.status, timesheetId: timesheet.id });
        } else {
          set({ timesheetStatus: null, timesheetId: null });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch timesheet status:', error);
    }
  },
}));