import { create } from 'zustand';
import { Session } from 'next-auth';

interface AppState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  notifications: any[]; // Replace 'any' with a proper Notification type later
  addNotification: (notification: any) => void;
  removeNotification: (notificationId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  notifications: [],
  addNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),
}));