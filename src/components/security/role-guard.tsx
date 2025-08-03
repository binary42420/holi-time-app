'use client';

import React, { ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { UserRole } from '@prisma/client';
import { hasPermission } from '@/lib/authorization';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
  resource?: string;
  action?: string;
  resourceData?: any;
  resourceId?: string;
  fallback?: ReactNode;
  showLoading?: boolean;
  loadingComponent?: ReactNode;
}

/**
 * RoleGuard component that conditionally renders children based on user permissions
 * 
 * @param children - Content to render if user has permission
 * @param allowedRoles - Array of roles that are allowed to see the content
 * @param requiredRole - Single role required (alternative to allowedRoles)
 * @param resource - Resource type for permission checking (e.g., 'JOB', 'SHIFT')
 * @param action - Action type for permission checking (e.g., 'READ', 'UPDATE')
 * @param resourceData - Resource data for context-aware permission checking
 * @param resourceId - Resource ID for permission checking
 * @param fallback - Component to render if user doesn't have permission
 * @param showLoading - Whether to show loading state
 * @param loadingComponent - Custom loading component
 */
export function RoleGuard({
  children,
  allowedRoles,
  requiredRole,
  resource,
  action,
  resourceData,
  resourceId,
  fallback = null,
  showLoading = true,
  loadingComponent,
}: RoleGuardProps) {
  const { user, isLoading } = useUser();

  // Show loading state
  if (isLoading && showLoading) {
    return loadingComponent || <div className="animate-pulse">Loading...</div>;
  }

  // No user - don't render anything
  if (!user) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  // Check role-based access
  if (allowedRoles) {
    hasAccess = allowedRoles.includes(user.role as UserRole);
  } else if (requiredRole) {
    hasAccess = user.role === requiredRole;
  } else if (resource && action) {
    // Use permission-based access control
    hasAccess = hasPermission(user, resource, action, {
      resource: resourceData,
      resourceId,
    });
  } else {
    // Default to allowing access if no restrictions specified
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component version of RoleGuard
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps: Omit<RoleGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard {...guardProps}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}

/**
 * Hook to check if current user has specific permissions
 */
export function usePermissions() {
  const { user } = useUser();

  const checkRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role as UserRole);
  };

  const checkPermission = (
    resource: string,
    action: string,
    context: { resource?: any; resourceId?: string } = {}
  ): boolean => {
    if (!user) return false;
    return hasPermission(user, resource, action, context);
  };

  const isAdmin = (): boolean => {
    return user?.role === UserRole.Admin;
  };

  const isCrewChief = (): boolean => {
    return user?.role === UserRole.CrewChief;
  };

  const isCompanyUser = (): boolean => {
    return user?.role === UserRole.CompanyUser;
  };

  const isEmployee = (): boolean => {
    return user?.role === UserRole.Employee;
  };

  const isStaff = (): boolean => {
    return user?.role === UserRole.Staff;
  };

  const canAccess = (resource: string, action: string, context?: any): boolean => {
    return checkPermission(resource, action, context);
  };

  return {
    user,
    checkRole,
    checkPermission,
    isAdmin,
    isCrewChief,
    isCompanyUser,
    isEmployee,
    isStaff,
    canAccess,
  };
}

/**
 * Predefined role combinations for common use cases
 */
export const ROLE_GROUPS = {
  ADMIN_ONLY: [UserRole.Admin],
  MANAGEMENT: [UserRole.Admin, UserRole.Staff],
  CREW_LEADERS: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief],
  ALL_STAFF: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee],
  CLIENT_ACCESS: [UserRole.Admin, UserRole.CompanyUser],
  FIELD_WORKERS: [UserRole.CrewChief, UserRole.Employee],
} as const;

/**
 * Component-specific guards for common UI patterns
 */
export function AdminOnlyGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function CrewLeaderGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.CREW_LEADERS} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ClientAccessGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.CLIENT_ACCESS} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * Resource-specific guards
 */
export function JobGuard({ 
  children, 
  action, 
  jobData, 
  jobId, 
  fallback 
}: { 
  children: ReactNode; 
  action: string; 
  jobData?: any; 
  jobId?: string; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard
      resource="JOB"
      action={action}
      resourceData={jobData}
      resourceId={jobId}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function ShiftGuard({ 
  children, 
  action, 
  shiftData, 
  shiftId, 
  fallback 
}: { 
  children: ReactNode; 
  action: string; 
  shiftData?: any; 
  shiftId?: string; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard
      resource="SHIFT"
      action={action}
      resourceData={shiftData}
      resourceId={shiftId}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function TimesheetGuard({ 
  children, 
  action, 
  timesheetData, 
  timesheetId, 
  fallback 
}: { 
  children: ReactNode; 
  action: string; 
  timesheetData?: any; 
  timesheetId?: string; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard
      resource="TIMESHEET"
      action={action}
      resourceData={timesheetData}
      resourceId={timesheetId}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}
