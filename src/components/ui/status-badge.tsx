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
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Zap,
  Target,
  Activity,
  Award,
  Star,
  Crown,
  Flame,
  Battery,
  BatteryLow,
  Wifi,
  WifiOff,
  MapPin,
  Phone,
  MessageSquare,
  Construction,
  Wrench,
  HardHat,
  Truck,
  Anchor,
  Zap as Spotlight,
  Theater,
  Lightbulb,
  Cable,
  Hammer,
  PersonStanding
} from 'lucide-react';

export interface StatusBadgeProps {
  status: string;
  count?: number;
  total?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showCount?: boolean;
  pulse?: boolean;
  className?: string;
}

// Enhanced status configurations with modern color palette
const statusConfigs = {
  // Job Statuses
  'Pending': { 
    label: 'Pending', 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', 
    icon: Clock,
    pulse: false
  },
  'Active': { 
    label: 'Active', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400', 
    icon: Play,
    pulse: true
  },
  'OnHold': { 
    label: 'On Hold', 
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400', 
    icon: Pause,
    pulse: false
  },
  'Completed': { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300', 
    icon: CheckCircle2,
    pulse: false,
    isCompleted: true
  },
  'Cancelled': { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400', 
    icon: XCircle,
    pulse: false
  },

  // Shift Statuses
  'InProgress': { 
    label: 'In Progress', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400', 
    icon: Timer,
    pulse: true
  },
  'Ongoing': { 
    label: 'Live', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: Activity,
    pulse: true,
    isLive: true
  },
  'Live': { 
    label: 'Live', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: Activity,
    pulse: true,
    isLive: true
  },
  'Scheduled': { 
    label: 'Scheduled', 
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400', 
    icon: Calendar,
    pulse: false
  },

  // Worker Statuses
  'Assigned': { 
    label: 'Assigned', 
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400', 
    icon: UserCheck,
    pulse: false
  },
  'ClockedIn': { 
    label: 'Working', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400', 
    icon: Play,
    pulse: true
  },
  'OnBreak': { 
    label: 'On Break', 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', 
    icon: Coffee,
    pulse: false
  },
  'ClockedOut': { 
    label: 'Break', 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', 
    icon: Coffee,
    pulse: false
  },
  'ShiftEnded': { 
    label: 'Completed', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400', 
    icon: CheckCircle2,
    pulse: false
  },
  'NoShow': { 
    label: 'No Show', 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400', 
    icon: XCircle,
    pulse: false
  },
  'UpForGrabs': { 
    label: 'Available', 
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400', 
    icon: Users,
    pulse: true
  },

  // Timesheet Statuses
  'DRAFT': { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400', 
    icon: FileText,
    pulse: false
  },
  'PENDING_COMPANY_APPROVAL': { 
    label: 'Pending Company', 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', 
    icon: Clock,
    pulse: true
  },
  'PENDING_MANAGER_APPROVAL': { 
    label: 'Pending Manager', 
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400', 
    icon: Clock,
    pulse: true
  },
  'REJECTED': { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400', 
    icon: XCircle,
    pulse: false
  },

  // Fulfillment Statuses (for worker assignment ratios)
  'CRITICAL': { 
    label: 'Critical', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: AlertTriangle,
    pulse: true
  },
  'LOW': { 
    label: 'Low', 
    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300', 
    icon: BatteryLow,
    pulse: false
  },
  'GOOD': { 
    label: 'Good', 
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', 
    icon: Battery,
    pulse: false
  },
  'FULL': { 
    label: 'Full', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300', 
    icon: CheckCircle2,
    pulse: false
  },
  'OVERSTAFFED': { 
    label: 'Overstaffed', 
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300', 
    icon: Users,
    pulse: false
  },

  // Enhanced Worker Performance Statuses
  'EXCELLENT': { 
    label: 'Excellent', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300', 
    icon: Crown,
    pulse: false
  },
  'GREAT': { 
    label: 'Great', 
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300', 
    icon: Star,
    pulse: false
  },
  'GOOD_PERFORMANCE': { 
    label: 'Good', 
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300', 
    icon: TrendingUp,
    pulse: false
  },
  'NEEDS_IMPROVEMENT': { 
    label: 'Needs Work', 
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', 
    icon: Target,
    pulse: false
  },
  'POOR': { 
    label: 'Poor', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: TrendingDown,
    pulse: false
  },

  // Role-Specific Statuses with Enhanced Colors and Icons
  'CREW_CHIEF': { 
    label: 'Crew Chief', 
    color: 'bg-blue-500 text-white border-blue-600 shadow-lg', 
    icon: Crown,
    pulse: false
  },
  'STAGEHAND': { 
    label: 'Stagehand', 
    color: 'bg-emerald-500 text-white border-emerald-600 shadow-lg', 
    icon: Spotlight,
    pulse: false
  },
  'FORK_OPERATOR': { 
    label: 'Fork Op', 
    color: 'bg-purple-500 text-white border-purple-600 shadow-lg', 
    icon: Truck,
    pulse: false
  },
  'RIGGER': { 
    label: 'Rigger', 
    color: 'bg-red-500 text-white border-red-600 shadow-lg', 
    icon: Anchor,
    pulse: false
  },
  'GENERAL_LABOR': { 
    label: 'General', 
    color: 'bg-slate-500 text-white border-slate-600 shadow-lg', 
    icon: HardHat,
    pulse: false
  },

  // Network and System Statuses
  'ONLINE': { 
    label: 'Online', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300', 
    icon: Wifi,
    pulse: false
  },
  'OFFLINE': { 
    label: 'Offline', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: WifiOff,
    pulse: true
  },
  'SYNCING': { 
    label: 'Syncing', 
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300', 
    icon: Activity,
    pulse: true
  },

  // Location and Contact Statuses
  'ON_SITE': { 
    label: 'On Site', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300', 
    icon: MapPin,
    pulse: false
  },
  'EN_ROUTE': { 
    label: 'En Route', 
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', 
    icon: Activity,
    pulse: true
  },
  'UNREACHABLE': { 
    label: 'Unreachable', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: Phone,
    pulse: false
  },
  'RESPONDED': { 
    label: 'Responded', 
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300', 
    icon: MessageSquare,
    pulse: false
  },

  // Urgency and Temperature Statuses
  'HOT': { 
    label: 'Hot', 
    color: 'bg-red-500 text-white border-red-600 shadow-lg animate-pulse', 
    icon: Flame,
    pulse: true
  },
  'WARM': { 
    label: 'Warm', 
    color: 'bg-orange-500 text-white border-orange-600 shadow-md', 
    icon: Zap,
    pulse: false
  },
  'COOL': { 
    label: 'Cool', 
    color: 'bg-blue-500 text-white border-blue-600 shadow-md', 
    icon: Timer,
    pulse: false
  },

  // Certification and Qualification Statuses
  'CERTIFIED': { 
    label: 'Certified', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300', 
    icon: Award,
    pulse: false
  },
  'EXPIRED': { 
    label: 'Expired', 
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300', 
    icon: XCircle,
    pulse: false
  },
  'EXPIRING_SOON': { 
    label: 'Expiring', 
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', 
    icon: Clock,
    pulse: true
  }
};

export function StatusBadge({ 
  status, 
  count, 
  total, 
  size = 'md', 
  showIcon = true, 
  showCount = false,
  pulse = false,
  className 
}: StatusBadgeProps) {
  const config = statusConfigs[status as keyof typeof statusConfigs] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400',
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

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  // Special handling for live status with recording indicator
  const isLive = (config as any).isLive;
  const isCompleted = (config as any).isCompleted;

  return (
    <Badge 
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border transition-all duration-200',
        config.color,
        sizeClasses[size],
        shouldPulse && 'animate-pulse',
        isLive && 'relative',
        className
      )}
    >
      {isLive && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500 rounded-full recording-indicator"></div>
          <span className="font-bold tracking-wide">LIVE</span>
        </div>
      )}
      {!isLive && showIcon && <Icon className={iconSizes[size]} />}
      {!isLive && <span>{config.label}</span>}
      {isCompleted && showIcon && (
        <CheckCircle2 className={cn(iconSizes[size], "text-green-600")} />
      )}
      {showCount && count !== undefined && (
        <span className="font-bold">
          {total !== undefined ? `${count}/${total}` : count}
        </span>
      )}
    </Badge>
  );
}

// Helper function to determine fulfillment status
export function getFulfillmentStatus(assigned: number, required: number): string {
  if (required === 0) return 'FULL';
  const percentage = (assigned / required) * 100;
  
  if (percentage > 110) return 'OVERSTAFFED';
  if (percentage >= 100) return 'FULL';
  if (percentage >= 80) return 'GOOD';
  if (percentage >= 60) return 'LOW';
  return 'CRITICAL';
}

// Helper function to get performance status based on rating
export function getPerformanceStatus(rating: number): string {
  if (rating >= 4.5) return 'EXCELLENT';
  if (rating >= 4.0) return 'GREAT';
  if (rating >= 3.5) return 'GOOD_PERFORMANCE';
  if (rating >= 2.5) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

// Helper function to get role status badge
export function getRoleStatus(roleCode: string): string {
  const roleMap: Record<string, string> = {
    'CC': 'CREW_CHIEF',
    'SH': 'STAGEHAND',
    'FO': 'FORK_OPERATOR',
    'RFO': 'FORK_OPERATOR',
    'RG': 'RIGGER',
    'GL': 'GENERAL_LABOR'
  };
  return roleMap[roleCode] || 'GENERAL_LABOR';
}

// Helper function to get certification status
export function getCertificationStatus(expirationDate: string | Date | null): string {
  if (!expirationDate) return 'EXPIRED';
  
  const expDate = new Date(expirationDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry <= 30) return 'EXPIRING_SOON';
  return 'CERTIFIED';
}

// Helper function to get urgency/temperature status
export function getUrgencyStatus(priority: 'high' | 'medium' | 'low' | string): string {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'urgent':
    case 'critical':
      return 'HOT';
    case 'medium':
    case 'normal':
      return 'WARM';
    case 'low':
    default:
      return 'COOL';
  }
}

// Helper function to determine network status
export function getNetworkStatus(isOnline: boolean, isSyncing: boolean = false): string {
  if (!isOnline) return 'OFFLINE';
  if (isSyncing) return 'SYNCING';
  return 'ONLINE';
}

// Helper function to get priority color for urgency indicators
export function getPriorityBadge(daysUntil: number) {
  if (daysUntil < 0) return 'OVERDUE';
  if (daysUntil === 0) return 'TODAY';
  if (daysUntil === 1) return 'TOMORROW';
  if (daysUntil <= 3) return 'URGENT';
  if (daysUntil <= 7) return 'SOON';
  return 'SCHEDULED';
}

// Additional priority status configs
const priorityConfigs = {
  'OVERDUE': { 
    label: 'Overdue', 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400', 
    icon: AlertTriangle,
    pulse: true
  },
  'TODAY': { 
    label: 'Today', 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400', 
    icon: Calendar,
    pulse: true
  },
  'TOMORROW': { 
    label: 'Tomorrow', 
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400', 
    icon: Calendar,
    pulse: false
  },
  'URGENT': { 
    label: 'Urgent', 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', 
    icon: Clock,
    pulse: false
  },
  'SOON': { 
    label: 'Soon', 
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400', 
    icon: Calendar,
    pulse: false
  },
  'SCHEDULED': { 
    label: 'Scheduled', 
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400', 
    icon: Calendar,
    pulse: false
  }
};

// Add priority configs to main status configs
Object.assign(statusConfigs, priorityConfigs);