'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldX, Crown, Building, Briefcase } from "lucide-react";
import { useCrewChiefPermissions, getPermissionDescription, getPermissionLevel } from '@/hooks/useCrewChiefPermissions';
import type { CrewChiefPermissionCheck } from '@/lib/types';

const permissionConfig = {
  none: {
    variant: 'destructive',
    Icon: ShieldX,
    text: 'No Access',
  },
  designated: {
    variant: 'default',
    Icon: Crown,
    text: 'Crew Chief',
  },
  client: {
    variant: 'secondary',
    Icon: Building,
    text: 'Client Access',
  },
  job: {
    variant: 'outline',
    Icon: Briefcase,
    text: 'Job Access',
  },
  shift: {
    variant: 'default',
    Icon: ShieldCheck,
    text: 'Shift Access',
  },
  default: {
    variant: 'secondary',
    Icon: Shield,
    text: 'Access',
  },
};

interface CrewChiefPermissionBadgeProps {
  shiftId: string;
  showDialog?: boolean;
}

export function CrewChiefPermissionBadge({
  shiftId,
  showDialog = true,
}: CrewChiefPermissionBadgeProps) {
  const { hasPermission, permissionCheck, isLoading } = useCrewChiefPermissions(shiftId);

  if (isLoading) {
    return (
      <Badge variant="outline" className="cursor-wait">
        <Shield className="mr-1 h-4 w-4 animate-pulse" />
        Checking...
      </Badge>
    );
  }

  const permissionLevel = getPermissionLevel(permissionCheck);
  const config = permissionConfig[hasPermission ? permissionLevel : 'none'] || permissionConfig.default;
  const { variant, Icon, text } = config;
  const description = getPermissionDescription(permissionCheck);

  const badge = (
    <Badge variant={variant}>
      <Icon className="mr-1 h-4 w-4" />
      {text}
    </Badge>
  );

  if (!showDialog) {
    return badge;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{badge}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon className="mr-2 h-5 w-5" />
            {text}
          </DialogTitle>
        </DialogHeader>
        <p className="pt-2">{description}</p>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionGuardProps {
  shiftId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requirePermission?: boolean;
}

export function PermissionGuard({
  shiftId,
  children,
  fallback = null,
  requirePermission = true
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useCrewChiefPermissions(shiftId);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Shield className="h-4 w-4 animate-pulse" /><span>Loading permissions...</span></div>;
  }

  if (requirePermission && !hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface PermissionStatusProps {
  permissionCheck: CrewChiefPermissionCheck | null;
  isLoading?: boolean;
}

export function PermissionStatus({ permissionCheck, isLoading }: PermissionStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Shield className="h-4 w-4 animate-pulse" />
        <span>Checking permissions...</span>
      </div>
    );
  }

  const hasPermission = permissionCheck?.hasPermission ?? false;
  const level = getPermissionLevel(permissionCheck);
  const config = permissionConfig[hasPermission ? level : 'none'] || permissionConfig.default;
  const { Icon, text } = config;
  const description = getPermissionDescription(permissionCheck);
  const textColor = hasPermission ? 'text-green-600' : 'text-red-600';

  return (
    <div className={`flex items-center gap-2 text-sm ${textColor}`}>
      <Icon className="h-4 w-4" />
      <span>{description}</span>
    </div>
  );
}
