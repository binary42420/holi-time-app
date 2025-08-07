import { User } from '@prisma/client';
import { UserRole } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string | null;
}

// Helper function to convert User to AuthenticatedUser
function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
  };
}

export interface AuthorizationContext {
  user: AuthenticatedUser;
  resource?: any;
  resourceId?: string;
}

// Role hierarchy - higher roles inherit permissions from lower roles
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.Employee]: 1,
  [UserRole.CrewChief]: 2,
  [UserRole.CompanyUser]: 2,
  [UserRole.Staff]: 3,
  [UserRole.Admin]: 4,
};

/**
 * Check if user has required role or higher
 */
export function hasMinimumRole(user: AuthenticatedUser, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: AuthenticatedUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user has exact role
 */
export function hasExactRole(user: AuthenticatedUser, role: UserRole): boolean {
  return user.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.Admin;
}

/**
 * Check if user is crew chief
 */
export function isCrewChief(user: AuthenticatedUser): boolean {
  return user.role === UserRole.CrewChief;
}

/**
 * Check if user is company user
 */
export function isCompanyUser(user: AuthenticatedUser): boolean {
  return user.role === UserRole.CompanyUser;
}

/**
 * Check if user belongs to the same company as the resource
 */
export function belongsToSameCompany(user: AuthenticatedUser, companyId: string): boolean {
  return user.companyId === companyId;
}

/**
 * Check if user can access resource based on ownership
 */
export function canAccessOwnResource(user: AuthenticatedUser, resourceUserId: string): boolean {
  return user.id === resourceUserId;
}

// Permission definitions for different resources
export const PERMISSIONS = {
  // User management
  USER: {
    CREATE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
    READ: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || canAccessOwnResource(ctx.user, ctx.resourceId || ''),
    UPDATE: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || canAccessOwnResource(ctx.user, ctx.resourceId || ''),
    DELETE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
  },

  // Company management
  COMPANY: {
    CREATE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
    READ: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || 
      (isCompanyUser(ctx.user) && belongsToSameCompany(ctx.user, ctx.resourceId || '')),
    UPDATE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
    DELETE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
  },

  // Job management
  JOB: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Staff),
    READ: (ctx: AuthorizationContext) => 
      hasMinimumRole(ctx.user, UserRole.Employee) ||
      (isCompanyUser(ctx.user) && ctx.resource?.companyId && belongsToSameCompany(ctx.user, ctx.resource.companyId)),
    UPDATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Staff),
    DELETE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
  },

  // Shift management
  SHIFT: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    READ: (ctx: AuthorizationContext) => 
      hasMinimumRole(ctx.user, UserRole.Employee) ||
      (isCompanyUser(ctx.user) && ctx.resource?.job?.companyId && belongsToSameCompany(ctx.user, ctx.resource.job.companyId)),
    UPDATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    DELETE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Staff),
  },

  // Timesheet management
  TIMESHEET: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    READ: (ctx: AuthorizationContext) => {
      if (isAdmin(ctx.user)) return true;
      if (isCrewChief(ctx.user) && ctx.resource?.shift?.assignedPersonnel.some((p: any) => p.userId === ctx.user.id && p.roleCode === 'CC')) return true;
      if (isCompanyUser(ctx.user) && ctx.resource?.shift?.job?.companyId && belongsToSameCompany(ctx.user, ctx.resource.shift.job.companyId)) return true;
      return false;
    },
    UPDATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    DELETE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Staff),
    APPROVE: (ctx: AuthorizationContext) => {
      // Client approval
      if (ctx.resource?.approvalType === 'client') {
        return isCompanyUser(ctx.user) && ctx.resource?.shift?.job?.companyId && belongsToSameCompany(ctx.user, ctx.resource.shift.job.companyId);
      }
      // Manager approval
      return hasMinimumRole(ctx.user, UserRole.CrewChief);
    },
    REJECT: (ctx: AuthorizationContext) => {
      return hasMinimumRole(ctx.user, UserRole.CrewChief) ||
        (isCompanyUser(ctx.user) && ctx.resource?.shift?.job?.companyId && belongsToSameCompany(ctx.user, ctx.resource.shift.job.companyId));
    },
  },

  // Notification management
  NOTIFICATION: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Staff),
    READ: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || canAccessOwnResource(ctx.user, ctx.resource?.userId || ''),
    UPDATE: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || canAccessOwnResource(ctx.user, ctx.resource?.userId || ''),
    DELETE: (ctx: AuthorizationContext) => 
      isAdmin(ctx.user) || canAccessOwnResource(ctx.user, ctx.resource?.userId || ''),
  },

  // Announcement management
  ANNOUNCEMENT: {
    CREATE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
    READ: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Employee),
    UPDATE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
    DELETE: (ctx: AuthorizationContext) => isAdmin(ctx.user),
  },

  // Worker requirement management
  WORKER_REQUIREMENT: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    READ: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Employee),
    UPDATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    DELETE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
  },

  // Time entry management
  TIME_ENTRY: {
    CREATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.Employee),
    READ: (ctx: AuthorizationContext) => 
      hasMinimumRole(ctx.user, UserRole.CrewChief) ||
      canAccessOwnResource(ctx.user, ctx.resource?.assignedPersonnel?.userId || ''),
    UPDATE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
    DELETE: (ctx: AuthorizationContext) => hasMinimumRole(ctx.user, UserRole.CrewChief),
  },
};

/**
 * Check if user has permission for a specific action on a resource
 */
export function hasPermission(
  user: AuthenticatedUser,
  resource: string,
  action: string,
  context: { resource?: any; resourceId?: string } = {}
): boolean {
  const resourcePermissions = PERMISSIONS[resource as keyof typeof PERMISSIONS];
  if (!resourcePermissions) {
    console.warn(`Unknown resource: ${resource}`);
    return false;
  }

  const actionPermission = resourcePermissions[action as keyof typeof resourcePermissions];
  if (!actionPermission) {
    console.warn(`Unknown action: ${action} for resource: ${resource}`);
    return false;
  }

  return actionPermission({ user, ...context });
}

/**
 * Authorization middleware for API routes
 */
export function withAuthorization(
  resource: string,
  action: string,
  options: {
    getResource?: (request: NextRequest, params?: any) => Promise<any>;
    getResourceId?: (request: NextRequest, params?: any) => string;
  } = {}
) {
  return function (handler: Function) {
    return async (request: NextRequest, context: any = {}) => {
      try {
        const fullUser = await getCurrentUser(request);
        if (!fullUser) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        const user = toAuthenticatedUser(fullUser);

        let resourceData = undefined;
        let resourceId = undefined;

        if (options.getResource) {
          resourceData = await options.getResource(request, context.params);
        }

        if (options.getResourceId) {
          resourceId = options.getResourceId(request, context.params);
        }

        const hasAccess = hasPermission(user, resource, action, {
          resource: resourceData,
          resourceId,
        });

        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }

        return handler(request, context);
      } catch (error) {
        console.error('Authorization error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Create authorization error response
 */
export function createAuthorizationErrorResponse(message: string = 'Access denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Create authentication error response
 */
export function createAuthenticationErrorResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}
