import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Pause, 
  Play, 
  Coffee,
  Users,
  UserCheck,
  FileText,
  Calendar,
  Timer,
  Activity,
  Award,
  Star,
  Crown,
  Flame,
  Battery,
  BatteryLow,
  Shield,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Phone,
  MessageSquare,
  Construction,
  Wrench,
  HardHat,
  Truck,
  Anchor,
  Theater,
  Lightbulb,
  Cable,
  Hammer,
  PersonStanding
} from "lucide-react";

export interface UnifiedStatusBadgeProps {
  status: string;
  count?: number;
  total?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showIcon?: boolean;
  showCount?: boolean;
  pulse?: boolean;
  className?: string;
}

// Enhanced status configurations using CSS variables from the global theme
const statusConfigs = {
  // Job Statuses
  'Pending': { 
    label: 'Pending', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: false
  },
  'Active': { 
    label: 'Active', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: Play,
    pulse: true
  },
  'OnHold': { 
    label: 'On Hold', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Pause,
    pulse: false
  },
  'Completed': { 
    label: 'Completed', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: CheckCircle2,
    pulse: false,
    isCompleted: true
  },
  'Cancelled': { 
    label: 'Cancelled', 
    className: 'bg-error-bg text-error border-error-border dark:bg-error-bg dark:text-error dark:border-error-border', 
    icon: XCircle,
    pulse: false
  },

  // Shift Statuses
  'InProgress': { 
    label: 'In Progress', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: Timer,
    pulse: true
  },
  'Ongoing': { 
    label: 'Live', 
    className: 'bg-error text-white border-error dark:bg-error dark:text-white dark:border-error', 
    icon: Activity,
    pulse: true,
    isLive: true
  },
  'Live': { 
    label: 'Live', 
    className: 'bg-error text-white border-error dark:bg-error dark:text-white dark:border-error', 
    icon: Activity,
    pulse: true,
    isLive: true
  },
  'Scheduled': { 
    label: 'Scheduled', 
    className: 'bg-info-bg text-info border-info-border dark:bg-info-bg dark:text-info dark:border-info-border', 
    icon: Calendar,
    pulse: false
  },
  'Pending Completion': { 
    label: 'Pending Completion', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: true
  },

  // Worker Statuses
  'Assigned': { 
    label: 'Assigned', 
    className: 'bg-info-bg text-info border-info-border dark:bg-info-bg dark:text-info dark:border-info-border', 
    icon: UserCheck,
    pulse: false
  },
  'ClockedIn': { 
    label: 'Working', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: Play,
    pulse: true
  },
  'OnBreak': { 
    label: 'On Break', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Coffee,
    pulse: false
  },
  'ClockedOut': { 
    label: 'Break', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Coffee,
    pulse: false
  },
  'ShiftEnded': { 
    label: 'Completed', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: CheckCircle2,
    pulse: false
  },
  'NoShow': { 
    label: 'No Show', 
    className: 'bg-error-bg text-error border-error-border dark:bg-error-bg dark:text-error dark:border-error-border', 
    icon: XCircle,
    pulse: false
  },
  'UpForGrabs': { 
    label: 'Available', 
    className: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/20', 
    icon: Users,
    pulse: true
  },

  // Timesheet Statuses
  'DRAFT': { 
    label: 'Draft', 
    className: 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border', 
    icon: FileText,
    pulse: false
  },
  'draft': { 
    label: 'Draft', 
    className: 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border', 
    icon: FileText,
    pulse: false
  },
  'PENDING_COMPANY_APPROVAL': { 
    label: 'Pending Company', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: true
  },
  'pending_company_approval': { 
    label: 'Pending Company', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: true
  },
  'PENDING_MANAGER_APPROVAL': { 
    label: 'Pending Manager', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: true
  },
  'pending_manager_approval': { 
    label: 'Pending Manager', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: Clock,
    pulse: true
  },
  'APPROVED': { 
    label: 'Approved', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: CheckCircle2,
    pulse: false
  },
  'approved': { 
    label: 'Approved', 
    className: 'bg-success-bg text-success border-success-border dark:bg-success-bg dark:text-success dark:border-success-border', 
    icon: CheckCircle2,
    pulse: false
  },
  'REJECTED': { 
    label: 'Rejected', 
    className: 'bg-error-bg text-error border-error-border dark:bg-error-bg dark:text-error dark:border-error-border', 
    icon: XCircle,
    pulse: false
  },
  'rejected': { 
    label: 'Rejected', 
    className: 'bg-error-bg text-error border-error-border dark:bg-error-bg dark:text-error dark:border-error-border', 
    icon: XCircle,
    pulse: false
  },

  // Fulfillment Statuses (for worker assignment ratios)
  'CRITICAL': { 
    label: 'Critical', 
    className: 'bg-error text-white border-error dark:bg-error dark:text-white dark:border-error', 
    icon: AlertTriangle,
    pulse: true
  },
  'LOW': { 
    label: 'Low', 
    className: 'bg-warning-bg text-warning border-warning-border dark:bg-warning-bg dark:text-warning dark:border-warning-border', 
    icon: BatteryLow,
    pulse: false
  },
  'GOOD': { 
    label: 'Good', 
    className: 'bg-info-bg text-info border-info-border dark:bg-info-bg dark:text-info dark:border-info-border', 
    icon: Battery,
    pulse: false
  },
  'FULL': { 
    label: 'Full', 
    className: 'bg-success text-white border-success dark:bg-success dark:text-white dark:border-success', 
    icon: CheckCircle2,
    pulse: false
  },
  'OVERSTAFFED': { 
    label: 'Overstaffed', 
    className: 'bg-info-bg text-info border-info-border dark:bg-info-bg dark:text-info dark:border-info-border', 
    icon: Users,
    pulse: false
  },

  // Role-Specific Statuses
  'CREW_CHIEF': { 
    label: 'Crew Chief', 
    className: 'bg-primary text-primary-foreground border-primary shadow-sm', 
    icon: Crown,
    pulse: false
  },
  'STAGEHAND': { 
    label: 'Stagehand', 
    className: 'bg-success text-white border-success shadow-sm', 
    icon: Theater,
    pulse: false
  },
  'FORK_OPERATOR': { 
    label: 'Fork Op', 
    className: 'bg-purple-500 text-white border-purple-500 shadow-sm dark:bg-purple-600 dark:border-purple-600', 
    icon: Truck,
    pulse: false
  },
  'RIGGER': { 
    label: 'Rigger', 
    className: 'bg-red-500 text-white border-red-500 shadow-sm dark:bg-red-600 dark:border-red-600', 
    icon: Anchor,
    pulse: false
  },
  'GENERAL_LABOR': { 
    label: 'General', 
    className: 'bg-slate-500 text-white border-slate-500 shadow-sm dark:bg-slate-600 dark:border-slate-600', 
    icon: HardHat,
    pulse: false
  },
};

export function UnifiedStatusBadge({ 
  status, 
  count, 
  total, 
  size = 'md', 
  variant = 'default',
  showIcon = true, 
  showCount = false,
  pulse = false,
  className 
}: UnifiedStatusBadgeProps) {
  const config = statusConfigs[status as keyof typeof statusConfigs] || {
    label: status,
    className: 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
    icon: Minus,
    pulse: false
  };

  const Icon = config.icon;
  const shouldPulse = pulse || config.pulse;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Content to display
  let displayText = config.label;
  if (showCount && count !== undefined) {
    if (total !== undefined) {
      displayText = `${displayText} (${count}/${total})`;
    } else {
      displayText = `${displayText} (${count})`;
    }
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-all duration-200',
        sizeClasses[size],
        config.className,
        shouldPulse && 'animate-pulse',
        'hover:scale-105 hover:shadow-sm',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(iconSizeClasses[size])} />
      )}
      {displayText}
    </Badge>
  );
}

// Export individual functions for backward compatibility
export function StatusBadge(props: UnifiedStatusBadgeProps) {
  return <UnifiedStatusBadge {...props} />;
}

export function getFulfillmentStatus(assigned: number, required: number): string {
  if (assigned === 0) return 'CRITICAL';
  if (assigned < required * 0.7) return 'LOW';
  if (assigned < required) return 'GOOD';
  if (assigned === required) return 'FULL';
  return 'OVERSTAFFED';
}

export function getPriorityBadge(priority: 'high' | 'medium' | 'low' | string) {
  const priorityMap = {
    'high': 'CRITICAL',
    'medium': 'GOOD', 
    'low': 'LOW'
  };
  return priorityMap[priority as keyof typeof priorityMap] || 'GOOD';
}

export default UnifiedStatusBadge;