import React from 'react';
import { EnhancedColorfulDashboard } from '@/components/enhanced-colorful-dashboard';
import { Enhanced3DShiftCard } from '@/components/enhanced-3d-shift-card';
import { EnhancedDateStatusIndicator, UrgencyTimeline } from '@/components/enhanced-date-status-indicators';
import { addDays, format } from 'date-fns';

// Sample data for demonstration
const sampleMetrics = {
  jobs: {
    total: 45,
    active: 12,
    pending: 8,
    completed: 20,
    onHold: 3,
    cancelled: 2
  },
  shifts: {
    total: 28,
    today: 5,
    tomorrow: 7,
    thisWeek: 15,
    active: 3,
    pending: 12,
    completed: 8,
    understaffed: 2,
    upcoming: [
      {
        id: '1',
        date: new Date().toISOString(),
        startTime: addDays(new Date(), 0).setHours(14, 0, 0, 0).toString(),
        endTime: addDays(new Date(), 0).setHours(22, 0, 0, 0).toString(),
        status: 'Active',
        job: { name: 'Concert Setup - Madison Square Garden' }
      },
      {
        id: '2',
        date: addDays(new Date(), 1).toISOString(),
        startTime: addDays(new Date(), 1).setHours(8, 0, 0, 0).toString(),
        endTime: addDays(new Date(), 1).setHours(18, 0, 0, 0).toString(),
        status: 'Pending',
        job: { name: 'Corporate Event - Times Square' }
      },
      {
        id: '3',
        date: addDays(new Date(), 2).toISOString(),
        startTime: addDays(new Date(), 2).setHours(6, 0, 0, 0).toString(),
        endTime: addDays(new Date(), 2).setHours(16, 0, 0, 0).toString(),
        status: 'Pending',
        job: { name: 'Trade Show - Javits Center' }
      },
      {
        id: '4',
        date: addDays(new Date(), 3).toISOString(),
        startTime: addDays(new Date(), 3).setHours(10, 0, 0, 0).toString(),
        endTime: addDays(new Date(), 3).setHours(20, 0, 0, 0).toString(),
        status: 'Pending',
        job: { name: 'Fashion Week Setup' }
      },
      {
        id: '5',
        date: addDays(new Date(), 7).toISOString(),
        startTime: addDays(new Date(), 7).setHours(12, 0, 0, 0).toString(),
        endTime: addDays(new Date(), 7).setHours(23, 0, 0, 0).toString(),
        status: 'Pending',
        job: { name: 'Broadway Show Load-in' }
      }
    ]
  },
  personnel: {
    totalRequired: 85,
    totalAssigned: 72,
    currentlyWorking: 15,
    onBreak: 3,
    completed: 28,
    noShows: 2
  },
  timesheets: {
    draft: 12,
    pendingCompany: 18,
    pendingManager: 8,
    completed: 45,
    rejected: 3
  },
  companies: {
    total: 15,
    active: 12
  }
};

const sampleShift = {
  id: 'shift-1',
  date: new Date().toISOString(),
  startTime: new Date().setHours(14, 0, 0, 0).toString(),
  endTime: new Date().setHours(22, 0, 0, 0).toString(),
  status: 'Active',
  location: 'Madison Square Garden, NYC',
  description: 'Concert setup and breakdown for major touring artist',
  requiredCrewChiefs: 2,
  requiredStagehands: 8,
  requiredForkOperators: 2,
  requiredReachForkOperators: 1,
  requiredRiggers: 3,
  requiredGeneralLaborers: 4,
  assignedPersonnel: [
    {
      id: 'worker-1',
      status: 'ClockedIn',
      roleCode: 'CC',
      user: {
        id: 'user-1',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1-555-0123',
        avatarUrl: undefined,
        performance: 92
      }
    },
    {
      id: 'worker-2',
      status: 'ClockedIn',
      roleCode: 'SH',
      user: {
        id: 'user-2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1-555-0124',
        avatarUrl: undefined,
        performance: 88
      }
    },
    {
      id: 'worker-3',
      status: 'OnBreak',
      roleCode: 'FO',
      user: {
        id: 'user-3',
        name: 'Mike Davis',
        email: 'mike@example.com',
        phone: '+1-555-0125',
        avatarUrl: undefined,
        performance: 85
      }
    },
    {
      id: 'worker-4',
      status: 'NoShow',
      roleCode: 'SH',
      user: {
        id: 'user-4',
        name: 'Lisa Wilson',
        email: 'lisa@example.com',
        phone: '+1-555-0126',
        avatarUrl: undefined,
        performance: 75
      }
    }
  ],
  job: {
    id: 'job-1',
    name: 'Concert Setup - Madison Square Garden',
    company: {
      name: 'Live Nation Entertainment'
    }
  }
};

export function EnhancedDashboardDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎨 Enhanced Holitime Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the new colorful, mobile-first design with enhanced status indicators, 
            3D effects, and improved date highlighting for better workforce management.
          </p>
        </div>

        {/* Enhanced Dashboard Overview */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">📊</span>
            </div>
            Enhanced Dashboard Overview
          </h2>
          <EnhancedColorfulDashboard metrics={sampleMetrics} />
        </section>

        {/* Enhanced Shift Card Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🎯</span>
            </div>
            Enhanced 3D Shift Card
          </h2>
          <Enhanced3DShiftCard 
            shift={sampleShift} 
            showActions={true}
            onAction={(action, shiftId, workerId) => {
              console.log('Action:', action, 'Shift:', shiftId, 'Worker:', workerId);
            }}
          />
        </section>

        {/* Date Status Indicators Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">📅</span>
            </div>
            Enhanced Date Status Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-4 text-lg">Today's Events</h3>
              <div className="space-y-3">
                <EnhancedDateStatusIndicator
                  date={new Date()}
                  startTime={new Date().setHours(9, 0, 0, 0).toString()}
                  endTime={new Date().setHours(17, 0, 0, 0).toString()}
                  status="Active"
                />
                <EnhancedDateStatusIndicator
                  date={new Date()}
                  startTime={new Date().setHours(19, 0, 0, 0).toString()}
                  endTime={new Date().setHours(23, 0, 0, 0).toString()}
                  status="Pending"
                />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-4 text-lg">Tomorrow's Events</h3>
              <div className="space-y-3">
                <EnhancedDateStatusIndicator
                  date={addDays(new Date(), 1)}
                  startTime={addDays(new Date(), 1).setHours(8, 0, 0, 0).toString()}
                  endTime={addDays(new Date(), 1).setHours(16, 0, 0, 0).toString()}
                  status="Pending"
                />
                <EnhancedDateStatusIndicator
                  date={addDays(new Date(), 1)}
                  startTime={addDays(new Date(), 1).setHours(18, 0, 0, 0).toString()}
                  endTime={addDays(new Date(), 1).setHours(22, 0, 0, 0).toString()}
                  status="Pending"
                />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-4 text-lg">Upcoming Events</h3>
              <div className="space-y-3">
                <EnhancedDateStatusIndicator
                  date={addDays(new Date(), 3)}
                  startTime={addDays(new Date(), 3).setHours(10, 0, 0, 0).toString()}
                  endTime={addDays(new Date(), 3).setHours(18, 0, 0, 0).toString()}
                  status="Pending"
                />
                <EnhancedDateStatusIndicator
                  date={addDays(new Date(), 7)}
                  startTime={addDays(new Date(), 7).setHours(12, 0, 0, 0).toString()}
                  endTime={addDays(new Date(), 7).setHours(20, 0, 0, 0).toString()}
                  status="Pending"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Highlight */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">✨</span>
            </div>
            New Features & Enhancements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-3 text-lg">🎨 Colorful Status Indicators</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Vibrant gradient-based status badges with 3D effects, animations, and better visual hierarchy for quick status recognition.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200 mb-3 text-lg">📅 Smart Date Highlighting</h3>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                Intelligent date indicators that change color and style based on urgency - today, tomorrow, overdue, and upcoming events.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-lg">
              <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-3 text-lg">📱 Mobile-First Design</h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                Optimized for mobile devices with larger touch targets, better spacing, and responsive layouts for field workers.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-xl border-2 border-amber-200 dark:border-amber-800 shadow-lg">
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-3 text-lg">🎯 3D Visual Effects</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Cards with depth, shadows, gradients, and hover animations that provide better visual feedback and modern aesthetics.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/30 rounded-xl border-2 border-rose-200 dark:border-rose-800 shadow-lg">
              <h3 className="font-bold text-rose-800 dark:text-rose-200 mb-3 text-lg">⚡ Enhanced Performance</h3>
              <p className="text-rose-700 dark:text-rose-300 text-sm">
                Optimized components with better state management, reduced re-renders, and improved loading states for faster interactions.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
              <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-3 text-lg">🚨 Smart Alerts</h3>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                Contextual alerts and notifications with priority-based styling to ensure critical information stands out immediately.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}