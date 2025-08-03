import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { CrewChiefPermissionCheck } from '@/lib/types';

interface UseCrewChiefPermissionsResult {
  hasPermission: boolean;
  permissionCheck: CrewChiefPermissionCheck | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to check crew chief permissions for a specific shift
 * Returns permission status and details about the permission source
 */
export function useCrewChiefPermissions(shiftId: string | null): UseCrewChiefPermissionsResult {
  const { data: session } = useSession();
  const [permissionCheck, setPermissionCheck] = useState<CrewChiefPermissionCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!shiftId || !session?.user) {
      setPermissionCheck(null);
      setIsLoading(false);
      return;
    }

    // Managers/Admins always have permission
    if (session.user.role === 'Admin') {
      setPermissionCheck({
        hasPermission: true,
        permissionSource: 'none', // Admin access doesn't need specific permissions
        permissions: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crew-chief-permissions/check?shiftId=${shiftId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check permissions: ${response.statusText}`);
      }

      const data = await response.json();
      setPermissionCheck(data);
    } catch (err) {
      console.error('Error checking crew chief permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to check permissions');
      setPermissionCheck({
        hasPermission: false,
        permissionSource: 'none',
        permissions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [shiftId, session?.user?.id, session?.user?.role]);

  return {
    hasPermission: permissionCheck?.hasPermission ?? false,
    permissionCheck,
    isLoading,
    error,
    refetch: fetchPermissions,
  };
}

/**
 * Hook to get user's crew chief permissions across all shifts
 */
export function useUserCrewChiefPermissions(userId?: string) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || session?.user?.id;

  const fetchUserPermissions = async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crew-chief-permissions?userId=${targetUserId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.statusText}`);
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPermissions();
  }, [targetUserId]);

  return {
    permissions,
    isLoading,
    error,
    refetch: fetchUserPermissions,
  };
}

/**
 * Helper function to get permission description for UI display
 */
export function getPermissionDescription(permissionCheck: CrewChiefPermissionCheck | null): string {
  if (!permissionCheck || !permissionCheck.hasPermission) {
    return 'No crew chief permissions';
  }

  switch (permissionCheck.permissionSource) {
    case 'designated':
      return 'Designated crew chief for this shift';
    case 'shift':
      return 'Admin-granted permission for this shift';
    case 'job':
      return 'Admin-granted permission for this job';
    case 'client':
      return 'Admin-granted permission for this client';
    default:
      return 'Has crew chief permissions';
  }
}

/**
 * Helper function to determine if user can manage time entries
 */
export function canManageTimeEntries(permissionCheck: CrewChiefPermissionCheck | null): boolean {
  return permissionCheck?.hasPermission ?? false;
}

/**
 * Helper function to determine permission level for UI styling
 */
export function getPermissionLevel(permissionCheck: CrewChiefPermissionCheck | null): 'none' | 'shift' | 'job' | 'client' | 'designated' | 'admin' {
  if (!permissionCheck || !permissionCheck.hasPermission) {
    return 'none';
  }
  return permissionCheck.permissionSource as any;
}
