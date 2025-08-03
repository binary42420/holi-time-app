'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from "@/hooks/use-user";
import { UserRole } from '@prisma/client';

interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  exact?: boolean;
  redirectTo?: string;
}

// Define route permissions
const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  {
    path: '/admin',
    allowedRoles: [UserRole.Admin],
    redirectTo: '/dashboard',
  },
  {
    path: '/employees',
    allowedRoles: [UserRole.Admin],
    redirectTo: '/dashboard',
  },
  {
    path: '/clients',
    allowedRoles: [UserRole.Admin],
    redirectTo: '/dashboard',
  },
  {
    path: '/import',
    allowedRoles: [UserRole.Admin],
    redirectTo: '/dashboard',
  },

  // Management routes
  {
    path: '/jobs',
    allowedRoles: [UserRole.Admin, UserRole.Staff],
    redirectTo: '/dashboard',
  },

  // Crew chief and above routes
  {
    path: '/shifts/create',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief],
    redirectTo: '/shifts',
  },
  {
    path: '/timesheets/create',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief],
    redirectTo: '/timesheets',
  },

  // General authenticated routes
  {
    path: '/dashboard',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee, UserRole.CompanyUser],
    redirectTo: '/login',
  },
  {
    path: '/shifts',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee, UserRole.CompanyUser],
    redirectTo: '/login',
  },
  {
    path: '/timesheets',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee, UserRole.CompanyUser],
    redirectTo: '/login',
  },
  {
    path: '/documents',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee, UserRole.CompanyUser],
    redirectTo: '/login',
  },
  {
    path: '/profile',
    allowedRoles: [UserRole.Admin, UserRole.Staff, UserRole.CrewChief, UserRole.Employee, UserRole.CompanyUser],
    redirectTo: '/login',
  },
];

interface NavigationGuardProps {
  children: React.ReactNode;
}

export function NavigationGuard({ children }: NavigationGuardProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check permissions while loading or on public routes
    if (isLoading || pathname === '/login' || pathname === '/register' || pathname === '/') {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Check route permissions
    const routePermission = ROUTE_PERMISSIONS.find(route => {
      if (route.exact) {
        return pathname === route.path;
      }
      return pathname.startsWith(route.path);
    });

    if (routePermission) {
      const hasAccess = routePermission.allowedRoles.includes(user.role as UserRole);
      
      if (!hasAccess) {
        const redirectTo = routePermission.redirectTo || '/dashboard';
        router.push(redirectTo);
        return;
      }
    }
  }, [user, isLoading, pathname, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if redirecting
  if (!user && pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user can access a specific route
 */
export function useRouteAccess() {
  const { user } = useUser();

  const canAccessRoute = (path: string): boolean => {
    if (!user) return false;

    const routePermission = ROUTE_PERMISSIONS.find(route => {
      if (route.exact) {
        return path === route.path;
      }
      return path.startsWith(route.path);
    });

    if (!routePermission) {
      // If no specific permission defined, allow access for authenticated users
      return true;
    }

    return routePermission.allowedRoles.includes(user.role as UserRole);
  };

  const getRedirectPath = (path: string): string => {
    const routePermission = ROUTE_PERMISSIONS.find(route => {
      if (route.exact) {
        return path === route.path;
      }
      return path.startsWith(route.path);
    });

    return routePermission?.redirectTo || '/dashboard';
  };

  return {
    canAccessRoute,
    getRedirectPath,
  };
}

/**
 * Component to conditionally render navigation links based on permissions
 */
interface ConditionalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
}

export function ConditionalLink({ href, children, className, fallback }: ConditionalLinkProps) {
  const { canAccessRoute } = useRouteAccess();

  if (!canAccessRoute(href)) {
    return <>{fallback}</>;
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/**
 * Enhanced navigation component with role-based filtering
 */
interface SecureNavLinkProps {
  href: string;
  label: string;
  icon?: React.ComponentType<any>;
  allowedRoles: UserRole[];
  children?: React.ReactNode;
  className?: string;
}

export function SecureNavLink({ 
  href, 
  label, 
  icon: Icon, 
  allowedRoles, 
  children, 
  className 
}: SecureNavLinkProps) {
  const { user } = useUser();

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return null;
  }

  return (
    <a href={href} className={className}>
      {Icon && <Icon className="h-4 w-4" />}
      {label}
      {children}
    </a>
  );
}

/**
 * Utility function to filter navigation items based on user role
 */
export function filterNavItems<T extends { roles: UserRole[] }>(
  items: T[],
  userRole?: UserRole | null
): T[] {
  if (!userRole) return [];
  return items.filter(item => item.roles.includes(userRole));
}

/**
 * Route protection utilities
 */
export const RouteProtection = {
  /**
   * Check if a route requires authentication
   */
  requiresAuth: (path: string): boolean => {
    const publicRoutes = ['/login', '/register', '/'];
    return !publicRoutes.includes(path);
  },

  /**
   * Check if a route is admin-only
   */
  isAdminOnly: (path: string): boolean => {
    const adminRoutes = ['/admin', '/employees', '/clients', '/import'];
    return adminRoutes.some(route => path.startsWith(route));
  },

  /**
   * Check if a route requires management access
   */
  requiresManagement: (path: string): boolean => {
    const managementRoutes = ['/jobs'];
    return managementRoutes.some(route => path.startsWith(route));
  },

  /**
   * Get the appropriate dashboard for a user role
   */
  getDashboardPath: (role: UserRole): string => {
    switch (role) {
      case UserRole.Admin:
        return '/dashboard';
      case UserRole.Staff:
        return '/dashboard';
      case UserRole.CrewChief:
        return '/dashboard';
      case UserRole.Employee:
        return '/dashboard';
      case UserRole.CompanyUser:
        return '/dashboard';
      default:
        return '/dashboard';
    }
  },
};
