"use client"

import { toast } from 'react-toastify';

class NotificationService {
  private static instance: NotificationService;
  private initialized = false;

  private constructor() {
    // Don't initialize in constructor to avoid SSR issues
  }

  private initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    
    this.initialized = true;
    this.requestNotificationPermission();
  }

  private async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }

  sendInstantNotification(title: string, message: string) {
    // Initialize on first use
    this.initialize();
    
    // Use toast for in-app notifications
    toast(`${title}: ${message}`, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    // Use browser notifications if available and permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  }

  scheduleNotification(shift: any) {
    // Initialize on first use
    this.initialize();
    
    const notificationTime = new Date(shift.date).getTime() - 30 * 60 * 1000;
    const now = Date.now();
    
    if (notificationTime > now) {
      setTimeout(() => {
        this.sendInstantNotification(
          'Shift Reminder',
          `Upcoming shift: ${shift.jobName}`
        );
      }, notificationTime - now);
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
}

// Export default instance only after checking for window
const notificationService = typeof window !== 'undefined' ? NotificationService.getInstance() : null;
export default notificationService;
