'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  PlayCircle, 
  PauseCircle,
  Calendar,
  Users,
  Briefcase,
  Building,
  Zap,
  Shield,
  Star,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export type StatusType = 
  | 'active' | 'completed' | 'pending' | 'cancelled' | 'in-progress' 
  | 'upcoming' | 'overdue' | 'draft' | 'approved' | 'rejected'
  | 'fully-staffed' | 'partially-staffed' | 'unstaffed'
  | 'high-priority' | 'medium-priority' | 'low-priority';

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'solid' | 'soft' | 'outline' | 'gradient';

interface EnhancedStatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  variant?: BadgeVariant;
  showIcon?: boolean;
  showPulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const statusConfig: Record<StatusType, {
  label: string;
  icon: React.ComponentType<any>;
  colors: {
    solid: string;
    soft: string;
    outline: string;
    gradient: string;
  };
  pulse?: boolean;
}> = {
  'active': {
    label: 'Active',
    icon: PlayCircle,
    colors: {
      solid: 'bg-emerald-500 text-white border-emerald-500',
      soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      outline: 'bg-transparent text-emerald-600 border-emerald-300',
      gradient: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent'
    },
    pulse: true
  },
  'completed': {
    label: 'Completed',
    icon: CheckCircle,
    colors: {
      solid: 'bg-blue-500 text-white border-blue-500',
      soft: 'bg-blue-50 text-blue-700 border-blue-200',
      outline: 'bg-transparent text-blue-600 border-blue-300',
      gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent'
    }
  },
  'pending': {
    label: 'Pending',
    icon: Clock,
    colors: {
      solid: 'bg-amber-500 text-white border-amber-500',
      soft: 'bg-amber-50 text-amber-700 border-amber-200',
      outline: 'bg-transparent text-amber-600 border-amber-300',
      gradient: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent'
    },
    pulse: true
  },
  'cancelled': {
    label: 'Cancelled',
    icon: XCircle,
    colors: {
      solid: 'bg-red-500 text-white border-red-500',
      soft: 'bg-red-50 text-red-700 border-red-200',
      outline: 'bg-transparent text-red-600 border-red-300',
      gradient: 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent'
    }
  },
  'in-progress': {
    label: 'In Progress',
    icon: Zap,
    colors: {
      solid: 'bg-purple-500 text-white border-purple-500',
      soft: 'bg-purple-50 text-purple-700 border-purple-200',
      outline: 'bg-transparent text-purple-600 border-purple-300',
      gradient: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white border-transparent'
    },
    pulse: true
  },
  'upcoming': {
    label: 'Upcoming',
    icon: Calendar,
    colors: {
      solid: 'bg-cyan-500 text-white border-cyan-500',
      soft: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      outline: 'bg-transparent text-cyan-600 border-cyan-300',
      gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent'
    }
  },
  'overdue': {
    label: 'Overdue',
    icon: AlertTriangle,
    colors: {
      solid: 'bg-red-600 text-white border-red-600',
      soft: 'bg-red-100 text-red-800 border-red-300',
      outline: 'bg-transparent text-red-700 border-red-400',
      gradient: 'bg-gradient-to-r from-red-600 to-red-700 text-white border-transparent'
    },
    pulse: true
  },
  'draft': {
    label: 'Draft',
    icon: PauseCircle,
    colors: {
      solid: 'bg-gray-500 text-white border-gray-500',
      soft: 'bg-gray-50 text-gray-700 border-gray-200',
      outline: 'bg-transparent text-gray-600 border-gray-300',
      gradient: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white border-transparent'
    }
  },
  'approved': {
    label: 'Approved',
    icon: Shield,
    colors: {
      solid: 'bg-green-500 text-white border-green-500',
      soft: 'bg-green-50 text-green-700 border-green-200',
      outline: 'bg-transparent text-green-600 border-green-300',
      gradient: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-transparent'
    }
  },
  'rejected': {
    label: 'Rejected',
    icon: XCircle,
    colors: {
      solid: 'bg-red-500 text-white border-red-500',
      soft: 'bg-red-50 text-red-700 border-red-200',
      outline: 'bg-transparent text-red-600 border-red-300',
      gradient: 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent'
    }
  },
  'fully-staffed': {
    label: 'Fully Staffed',
    icon: Users,
    colors: {
      solid: 'bg-emerald-500 text-white border-emerald-500',
      soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      outline: 'bg-transparent text-emerald-600 border-emerald-300',
      gradient: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent'
    }
  },
  'partially-staffed': {
    label: 'Partially Staffed',
    icon: Users,
    colors: {
      solid: 'bg-amber-500 text-white border-amber-500',
      soft: 'bg-amber-50 text-amber-700 border-amber-200',
      outline: 'bg-transparent text-amber-600 border-amber-300',
      gradient: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent'
    }
  },
  'unstaffed': {
    label: 'Unstaffed',
    icon: AlertCircle,
    colors: {
      solid: 'bg-red-500 text-white border-red-500',
      soft: 'bg-red-50 text-red-700 border-red-200',
      outline: 'bg-transparent text-red-600 border-red-300',
      gradient: 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent'
    },
    pulse: true
  },
  'high-priority': {
    label: 'High Priority',
    icon: Star,
    colors: {
      solid: 'bg-red-500 text-white border-red-500',
      soft: 'bg-red-50 text-red-700 border-red-200',
      outline: 'bg-transparent text-red-600 border-red-300',
      gradient: 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent'
    },
    pulse: true
  },
  'medium-priority': {
    label: 'Medium Priority',
    icon: TrendingUp,
    colors: {
      solid: 'bg-amber-500 text-white border-amber-500',
      soft: 'bg-amber-50 text-amber-700 border-amber-200',
      outline: 'bg-transparent text-amber-600 border-amber-300',
      gradient: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent'
    }
  },
  'low-priority': {
    label: 'Low Priority',
    icon: TrendingUp,
    colors: {
      solid: 'bg-gray-500 text-white border-gray-500',
      soft: 'bg-gray-50 text-gray-700 border-gray-200',
      outline: 'bg-transparent text-gray-600 border-gray-300',
      gradient: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white border-transparent'
    }
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

export function EnhancedStatusBadge({
  status,
  size = 'md',
  variant = 'soft',
  showIcon = true,
  showPulse = false,
  className,
  children
}: EnhancedStatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return (
      <span className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        'bg-gray-100 text-gray-800 border-gray-300',
        className
      )}>
        {children || status}
      </span>
    );
  }

  const Icon = config.icon;
  const shouldPulse = showPulse || config.pulse;

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium transition-all duration-200',
      sizeClasses[size],
      config.colors[variant],
      shouldPulse && 'animate-pulse',
      'hover:scale-105 hover:shadow-md',
      className
    )}>
      {showIcon && (
        <Icon className={cn(iconSizes[size], children ? 'mr-1.5' : '')} />
      )}
      {children || config.label}
    </span>
  );
}

export default EnhancedStatusBadge;
