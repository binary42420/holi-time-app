'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RoleGuard, usePermissions } from './role-guard';
import { UserRole } from '@prisma/client';

interface ActionGuardProps {
  children: ReactNode;
  action: string;
  resource?: string;
  resourceData?: any;
  resourceId?: string;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * ActionGuard wraps interactive elements (buttons, links) with permission checks
 */
export function ActionGuard({
  children,
  action,
  resource,
  resourceData,
  resourceId,
  allowedRoles,
  fallback,
  disabled = false,
  disabledMessage,
}: ActionGuardProps) {
  const { canAccess, checkRole } = usePermissions();

  let hasPermission = false;

  if (resource && action) {
    hasPermission = canAccess(resource, action, { resource: resourceData, resourceId });
  } else if (allowedRoles) {
    hasPermission = checkRole(allowedRoles);
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  if (disabled) {
    return (
      <div title={disabledMessage} className="opacity-50 cursor-not-allowed">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Secure button component with built-in permission checking
 */
interface SecureButtonProps {
  children: ReactNode;
  onClick?: () => void;
  action: string;
  resource?: string;
  resourceData?: any;
  resourceId?: string;
  allowedRoles?: UserRole[];
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
  fallback?: ReactNode;
}

export function SecureButton({
  children,
  onClick,
  action,
  resource,
  resourceData,
  resourceId,
  allowedRoles,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  disabledMessage,
  fallback,
}: SecureButtonProps) {
  return (
    <ActionGuard
      action={action}
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      allowedRoles={allowedRoles}
      disabled={disabled}
      disabledMessage={disabledMessage}
      fallback={fallback}
    >
      <Button
        onClick={onClick}
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        title={disabled ? disabledMessage : undefined}
      >
        {children}
      </Button>
    </ActionGuard>
  );
}

/**
 * Predefined secure buttons for common actions
 */
export function CreateButton({ 
  children, 
  onClick, 
  resource, 
  disabled, 
  className 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  resource: string; 
  disabled?: boolean; 
  className?: string;
}) {
  return (
    <SecureButton
      action="CREATE"
      resource={resource}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </SecureButton>
  );
}

export function EditButton({ 
  children, 
  onClick, 
  resource, 
  resourceData, 
  resourceId, 
  disabled, 
  className 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  resource: string; 
  resourceData?: any; 
  resourceId?: string; 
  disabled?: boolean; 
  className?: string;
}) {
  return (
    <SecureButton
      action="UPDATE"
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      onClick={onClick}
      disabled={disabled}
      className={className}
      variant="outline"
    >
      {children}
    </SecureButton>
  );
}

export function DeleteButton({ 
  children, 
  onClick, 
  resource, 
  resourceData, 
  resourceId, 
  disabled, 
  className 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  resource: string; 
  resourceData?: any; 
  resourceId?: string; 
  disabled?: boolean; 
  className?: string;
}) {
  return (
    <SecureButton
      action="DELETE"
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      onClick={onClick}
      disabled={disabled}
      className={className}
      variant="destructive"
    >
      {children}
    </SecureButton>
  );
}

export function ApproveButton({ 
  children, 
  onClick, 
  resource, 
  resourceData, 
  resourceId, 
  disabled, 
  className 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  resource: string; 
  resourceData?: any; 
  resourceId?: string; 
  disabled?: boolean; 
  className?: string;
}) {
  return (
    <SecureButton
      action="APPROVE"
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </SecureButton>
  );
}

export function RejectButton({ 
  children, 
  onClick, 
  resource, 
  resourceData, 
  resourceId, 
  disabled, 
  className 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  resource: string; 
  resourceData?: any; 
  resourceId?: string; 
  disabled?: boolean; 
  className?: string;
}) {
  return (
    <SecureButton
      action="REJECT"
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      onClick={onClick}
      disabled={disabled}
      className={className}
      variant="destructive"
    >
      {children}
    </SecureButton>
  );
}

/**
 * Conditional rendering for form fields based on permissions
 */
interface SecureFieldProps {
  children: ReactNode;
  action: string;
  resource?: string;
  resourceData?: any;
  resourceId?: string;
  allowedRoles?: UserRole[];
  readOnly?: boolean;
  fallback?: ReactNode;
}

export function SecureField({
  children,
  action,
  resource,
  resourceData,
  resourceId,
  allowedRoles,
  readOnly = false,
  fallback,
}: SecureFieldProps) {
  return (
    <RoleGuard
      resource={resource}
      action={action}
      resourceData={resourceData}
      resourceId={resourceId}
      allowedRoles={allowedRoles}
      fallback={fallback}
    >
      <div className={readOnly ? 'pointer-events-none opacity-75' : ''}>
        {children}
      </div>
    </RoleGuard>
  );
}

/**
 * Menu item with permission checking
 */
interface SecureMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  action: string;
  resource?: string;
  resourceData?: any;
  resourceId?: string;
  allowedRoles?: UserRole[];
  className?: string;
}

export function SecureMenuItem({
  children,
  onClick,
  action,
  resource,
  resourceData,
  resourceId,
  allowedRoles,
  className,
}: SecureMenuItemProps) {
  return (
    <ActionGuard
      action={action}
      resource={resource}
      resourceData={resourceData}
      resourceId={resourceId}
      allowedRoles={allowedRoles}
    >
      <div onClick={onClick} className={className}>
        {children}
      </div>
    </ActionGuard>
  );
}

/**
 * Tab with permission checking
 */
interface SecureTabProps {
  children: ReactNode;
  action: string;
  resource?: string;
  allowedRoles?: UserRole[];
  value: string;
  className?: string;
}

export function SecureTab({
  children,
  action,
  resource,
  allowedRoles,
  value,
  className,
}: SecureTabProps) {
  return (
    <RoleGuard
      resource={resource}
      action={action}
      allowedRoles={allowedRoles}
    >
      <div data-value={value} className={className}>
        {children}
      </div>
    </RoleGuard>
  );
}
