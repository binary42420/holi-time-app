'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { ComponentErrorBoundary } from '@/components/error-boundaries/enhanced-error-boundary';

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Error fallback for failed lazy loads
const LazyLoadError = () => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <p className="text-red-800">Failed to load component. Please refresh the page.</p>
  </div>
);

// HOC for wrapping lazy components with error boundaries and loading states
function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: ComponentType,
  errorComponent?: ComponentType
) {
  const LazyComponent = dynamic(importFn, {
    loading: loadingComponent || LoadingSpinner,
    ssr: false, // Disable SSR for heavy components
  });

  return (props: P) => (
    <ComponentErrorBoundary fallback={errorComponent || <LazyLoadError />}>
      <LazyComponent {...props} />
    </ComponentErrorBoundary>
  );
}

// Heavy chart components - lazy loaded
export const LazyRechartsChart = withLazyLoading(
  () => import('@/components/charts/recharts-wrapper'),
  () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading chart...</p>
      </div>
    </div>
  )
);

// PDF components - lazy loaded
export const LazyPDFViewer = withLazyLoading(
  () => import('@/components/pdf/pdf-viewer'),
  () => (
    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading PDF viewer...</p>
      </div>
    </div>
  )
);

export const LazyPDFGenerator = withLazyLoading(
  () => import('@/components/pdf/pdf-generator')
);

// Excel components - lazy loaded
export const LazyExcelImporter = withLazyLoading(
  () => import('@/components/excel/excel-importer'),
  () => (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading Excel importer...</p>
      </div>
    </div>
  )
);

export const LazyExcelExporter = withLazyLoading(
  () => import('@/components/excel/excel-exporter')
);

// Drag and drop components - lazy loaded
export const LazyDragDropList = withLazyLoading(
  () => import('@/components/dnd/drag-drop-list'),
  () => (
    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
      <div className="animate-pulse">Loading drag & drop...</div>
    </div>
  )
);

// Calendar components - lazy loaded
export const LazyCalendarView = withLazyLoading(
  () => import('@/components/calendar/calendar-view'),
  () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    </div>
  )
);

// Rich text editor - lazy loaded
export const LazyRichTextEditor = withLazyLoading(
  () => import('@/components/editor/rich-text-editor'),
  () => (
    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading editor...</p>
      </div>
    </div>
  )
);

// Data visualization components - lazy loaded
export const LazyDataVisualization = withLazyLoading(
  () => import('@/components/visualization/data-viz'),
  () => (
    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading visualization...</p>
      </div>
    </div>
  )
);

// Admin components - lazy loaded (only for admin users)
export const LazyAdminDashboard = withLazyLoading(
  () => import('@/components/admin/admin-dashboard')
);

export const LazyUserManagement = withLazyLoading(
  () => import('@/components/admin/user-management')
);

export const LazySystemSettings = withLazyLoading(
  () => import('@/components/admin/system-settings')
);

// Reports components - lazy loaded
export const LazyReportsGenerator = withLazyLoading(
  () => import('@/components/reports/reports-generator'),
  () => (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading reports...</p>
      </div>
    </div>
  )
);

// Signature pad - lazy loaded
export const LazySignaturePad = withLazyLoading(
  () => import('@/components/signature/signature-pad'),
  () => (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading signature pad...</p>
      </div>
    </div>
  )
);

// Utility function to preload components
export const preloadComponent = (importFn: () => Promise<any>) => {
  if (typeof window !== 'undefined') {
    // Preload on user interaction or after initial load
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    }, 100);
  }
};

// Preload critical components after initial page load
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload commonly used components
    setTimeout(() => {
      preloadComponent(() => import('@/components/charts/recharts-wrapper'));
      preloadComponent(() => import('@/components/pdf/pdf-viewer'));
    }, 2000); // Preload after 2 seconds
  }
};

// Route-based code splitting helpers
export const createLazyRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) => {
  return dynamic(importFn, {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    ),
    ssr: true, // Enable SSR for route components
  });
};

// Feature-based lazy loading
export const LazyFeature = {
  // Authentication features
  Auth: {
    LoginForm: withLazyLoading(() => import('@/components/auth/login-form')),
    RegisterForm: withLazyLoading(() => import('@/components/auth/register-form')),
    PasswordReset: withLazyLoading(() => import('@/components/auth/password-reset')),
  },
  
  // Dashboard features
  Dashboard: {
    Analytics: withLazyLoading(() => import('@/components/dashboard/analytics')),
    RecentActivity: withLazyLoading(() => import('@/components/dashboard/recent-activity')),
    QuickActions: withLazyLoading(() => import('@/components/dashboard/quick-actions')),
  },
  
  // Job management features
  Jobs: {
    JobForm: withLazyLoading(() => import('@/components/jobs/job-form')),
    JobDetails: withLazyLoading(() => import('@/components/jobs/job-details')),
    JobList: withLazyLoading(() => import('@/components/jobs/job-list')),
  },
  
  // Shift management features
  Shifts: {
    ShiftForm: withLazyLoading(() => import('@/components/shifts/shift-form')),
    ShiftCalendar: withLazyLoading(() => import('@/components/shifts/shift-calendar')),
    ShiftAssignments: withLazyLoading(() => import('@/components/shifts/shift-assignments')),
  },
  
  // Timesheet features
  Timesheets: {
    TimesheetForm: withLazyLoading(() => import('@/components/timesheets/timesheet-form')),
    TimesheetApproval: withLazyLoading(() => import('@/components/timesheets/timesheet-approval')),
    TimesheetReports: withLazyLoading(() => import('@/components/timesheets/timesheet-reports')),
  },
};

// Export utility for checking if component should be lazy loaded
export const shouldLazyLoad = (componentName: string): boolean => {
  const heavyComponents = [
    'chart', 'pdf', 'excel', 'calendar', 'editor', 'visualization',
    'admin', 'reports', 'signature', 'drag', 'drop'
  ];
  
  return heavyComponents.some(heavy => 
    componentName.toLowerCase().includes(heavy)
  );
};