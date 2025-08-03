'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  Trash2,
  Crown,
  Building,
  Briefcase,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  MoreVertical,
} from "lucide-react";
import type { CrewChiefPermission, CrewChiefPermissionType } from '@/lib/types';
import { User, UserRole } from '@prisma/client';

interface CrewChiefPermissionManagerProps {
  targetId: string;
  targetType: CrewChiefPermissionType;
  targetName: string;
  className?: string;
}

interface PermissionWithUser extends CrewChiefPermission {
  userId: string;
  userName?: string;
  userRole?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Admin':
      return <Crown size={16} className="text-purple-500" />;
    case 'CrewChief':
      return <Shield size={16} className="text-yellow-500" />;
    case 'StageHand':
      return <Shield size={16} className="text-blue-500" />;
    default:
      return <UserIcon size={16} className="text-gray-400" />;
  }
};

export function CrewChiefPermissionManager({
  targetId,
  targetType,
  targetName,
  className,
}: CrewChiefPermissionManagerProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<PermissionWithUser[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<PermissionWithUser | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/crew-chief-permissions/manage?permissionType=${targetType}&targetId=${targetId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
        setEligibleUsers(data.eligibleUsers || []);
      } else {
        throw new Error('Failed to fetch permission data');
      }
    } catch (error) {
      console.error('Error fetching permission data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [targetId, targetType, toast]);

  useEffect(() => {
    if (session?.user?.role === UserRole.Admin) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleGrantPermission = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      const response = await fetch('/api/crew-chief-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          permissionType: targetType,
          targetId: targetId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission granted successfully',
        });
        setSelectedUserId(null);
        await fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant permission');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePermission = async (permission: PermissionWithUser) => {
    try {
      const response = await fetch(
        `/api/crew-chief-permissions?userId=${permission.userId}&permissionType=${permission.permissionType}&targetId=${permission.targetId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission revoked successfully',
        });
        await fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke permission');
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setShowRevokeModal(null);
    }
  };

  const getTargetIcon = () => {
    switch (targetType) {
      case 'client':
        return <Building size={16} />;
      case 'job':
        return <Briefcase size={16} />;
      case 'shift':
        return <ShieldCheck size={16} />;
      default:
        return <Shield size={16} />;
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'client':
        return 'Client Company';
      case 'job':
        return 'Job';
      case 'shift':
        return 'Shift';
      default:
        return 'Target';
    }
  };

  const availableUsers = eligibleUsers.filter(
    (user) => !permissions.some((p) => p.userId === user.id)
  );

  if (session?.user?.role !== UserRole.Admin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Loading permissions...</p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getTargetIcon()}
            <CardTitle>Crew Chief Permissions</CardTitle>
          </div>
          <CardDescription>
            Manage crew chief permissions for this {getTargetTypeLabel().toLowerCase()}: {targetName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Current Permissions ({permissions.length})</h3>
            {permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No crew chief permissions granted for this {getTargetTypeLabel().toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <p className="font-medium truncate">{permission.userName}</p>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {permission.userRole}
                      </Badge>
                    </div>
                    <div className="hidden sm:block">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowRevokeModal(permission)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setShowRevokeModal(permission)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Grant New Permission</h3>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All eligible users already have permissions for this {getTargetTypeLabel().toLowerCase()}.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-grow">
                  <Select value={selectedUserId ?? ''} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user to grant permission" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role)}
                              <span>{user.name}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGrantPermission}
                  disabled={isGranting || !selectedUserId}
                  className="w-full sm:w-auto"
                >
                  {isGranting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Grant
                </Button>
              </div>
            )}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              Users with crew chief permissions for this {getTargetTypeLabel().toLowerCase()} can manage
              time entries and shift operations for all related shifts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Dialog
        open={!!showRevokeModal}
        onOpenChange={(isOpen) => !isOpen && setShowRevokeModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke crew chief permission for {showRevokeModal?.userName} on
              this {getTargetTypeLabel().toLowerCase()}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRevokePermission(showRevokeModal!)}
            >
              Revoke Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
