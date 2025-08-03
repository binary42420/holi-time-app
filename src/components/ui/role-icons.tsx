import React from 'react';
import { 
  Crown,
  Truck,
  Anchor,
  HardHat,
  Zap as Spotlight,
  Users,
  Shield,
  Activity,
  Construction,
  Wrench
} from "lucide-react";
import { cn } from '@/lib/utils';

export interface RoleIconProps {
  roleCode: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showLabel?: boolean;
}

// Role configuration with profession-specific icons
const roleConfigs = {
  'CC': {
    name: 'Crew Chief',
    icon: Crown,
    description: 'Leadership and crew coordination',
    color: 'text-blue-600'
  },
  'SH': {
    name: 'Stagehand', 
    icon: Spotlight,
    description: 'Stage setup and lighting operations',
    color: 'text-emerald-600'
  },
  'FO': {
    name: 'Fork Operator',
    icon: Truck,
    description: 'Forklift and heavy equipment operation',
    color: 'text-purple-600'
  },
  'RFO': {
    name: 'Reach Fork Operator',
    icon: Truck,
    description: 'Reach forklift and elevated equipment',
    color: 'text-purple-600'
  },
  'RG': {
    name: 'Rigger',
    icon: Anchor,
    description: 'Rigging, climbing, and safety-critical work',
    color: 'text-red-600'
  },
  'GL': {
    name: 'General Labor',
    icon: HardHat,
    description: 'General labor and support tasks',
    color: 'text-slate-600'
  }
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5', 
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
};

export function RoleIcon({ 
  roleCode, 
  size = 'md', 
  className,
  showLabel = false 
}: RoleIconProps) {
  const config = roleConfigs[roleCode as keyof typeof roleConfigs] || {
    name: roleCode,
    icon: Users,
    description: 'Unknown role',
    color: 'text-gray-600'
  };

  const Icon = config.icon;

  if (showLabel) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon className={cn(sizeClasses[size], config.color)} />
        <span className="text-sm font-medium">{config.name}</span>
      </div>
    );
  }

  return (
    <Icon 
      className={cn(
        sizeClasses[size], 
        config.color,
        className
      )} 
      title={`${config.name} - ${config.description}`}
    />
  );
}

// Helper component for role badges with consistent styling
export function RoleBadge({ 
  roleCode, 
  size = 'md',
  variant = 'default',
  className 
}: RoleIconProps & { variant?: 'default' | 'outline' | 'solid' }) {
  const config = roleConfigs[roleCode as keyof typeof roleConfigs] || {
    name: roleCode,
    icon: Users,
    description: 'Unknown role',
    color: 'text-gray-600'
  };

  const Icon = config.icon;

  const variantStyles = {
    default: 'bg-muted/50 text-muted-foreground border border-muted',
    outline: `border-2 bg-transparent ${config.color} border-current`,
    solid: getsolidBadgeStyle(roleCode)
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
      variantStyles[variant],
      className
    )}>
      <Icon className={sizeClasses[size]} />
      <span>{config.name}</span>
    </div>
  );
}

// Get solid badge styling for each role
function getsolidBadgeStyle(roleCode: string): string {
  const styles: Record<string, string> = {
    'CC': 'bg-blue-500 text-white border-blue-600',
    'SH': 'bg-emerald-500 text-white border-emerald-600',
    'FO': 'bg-purple-500 text-white border-purple-600',
    'RFO': 'bg-purple-500 text-white border-purple-600',
    'RG': 'bg-red-500 text-white border-red-600',
    'GL': 'bg-slate-500 text-white border-slate-600'
  };
  return styles[roleCode] || 'bg-gray-500 text-white border-gray-600';
}

// Role legend component
export function RoleLegend({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Worker Roles
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(roleConfigs).map(([code, config]) => {
          const Icon = config.icon;
          return (
            <div key={code} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                getIconBackgroundColor(code)
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm">{config.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {config.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to get icon background colors
function getIconBackgroundColor(roleCode: string): string {
  const colors: Record<string, string> = {
    'CC': 'bg-blue-500 border-blue-600',
    'SH': 'bg-emerald-500 border-emerald-600', 
    'FO': 'bg-purple-500 border-purple-600',
    'RFO': 'bg-purple-500 border-purple-600',
    'RG': 'bg-red-500 border-red-600',
    'GL': 'bg-slate-500 border-slate-600'
  };
  return colors[roleCode] || 'bg-gray-500 border-gray-600';
}

// Export role configurations for use in other components
export { roleConfigs };

// Helper functions for role management
export const getRoleName = (roleCode: string): string => {
  return roleConfigs[roleCode as keyof typeof roleConfigs]?.name || roleCode;
};

export const getRoleDescription = (roleCode: string): string => {
  return roleConfigs[roleCode as keyof typeof roleConfigs]?.description || 'Unknown role';
};

export const getRoleIcon = (roleCode: string) => {
  return roleConfigs[roleCode as keyof typeof roleConfigs]?.icon || Users;
};

export const getAllRoles = () => {
  return Object.entries(roleConfigs).map(([code, config]) => ({
    code,
    ...config
  }));
};

// Role priority for sorting (crew chiefs first, general labor last)
export const getRolePriority = (roleCode: string): number => {
  const priorities: Record<string, number> = {
    'CC': 1,   // Crew Chief - highest priority
    'RG': 2,   // Rigger - safety critical
    'FO': 3,   // Fork Operator - specialized equipment
    'RFO': 4,  // Reach Fork Operator - specialized equipment
    'SH': 5,   // Stagehand - core workforce
    'GL': 6    // General Labor - entry level
  };
  return priorities[roleCode] || 999;
};

// Example usage component
export function RoleIconsExample() {
  const allRoles = getAllRoles();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Role Icons System</h2>
        <p className="text-muted-foreground mb-6">
          Profession-specific icons for instant role recognition in workforce management.
        </p>
      </div>

      {/* Icon Sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Icon Sizes</h3>
        <div className="flex items-center gap-6">
          {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
            <div key={size} className="text-center">
              <RoleIcon roleCode="CC" size={size} />
              <div className="text-xs mt-1 text-muted-foreground capitalize">{size}</div>
            </div>
          ))}
        </div>
      </div>

      {/* All Role Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Role Icons</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {allRoles.map(role => (
            <div key={role.code} className="text-center p-3 border rounded-lg">
              <RoleIcon roleCode={role.code} size="lg" />
              <div className="text-sm font-medium mt-2">{role.name}</div>
              <div className="text-xs text-muted-foreground">{role.code}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Badges */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Role Badge Variants</h3>
        <div className="space-y-3">
          {(['default', 'outline', 'solid'] as const).map(variant => (
            <div key={variant} className="space-y-2">
              <h4 className="text-sm font-medium capitalize">{variant} Style</h4>
              <div className="flex flex-wrap gap-2">
                {allRoles.map(role => (
                  <RoleBadge 
                    key={role.code} 
                    roleCode={role.code} 
                    variant={variant}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Legend */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Role Legend Component</h3>
        <RoleLegend />
      </div>
    </div>
  );
}