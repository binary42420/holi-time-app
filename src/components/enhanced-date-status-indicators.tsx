import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  Zap,
  Flame,
  Timer,
  CheckCircle2,
  ArrowRight,
  Sunrise,
  Sun,
  Sunset,
  Moon
} from "lucide-react";
import { format, differenceInDays, differenceInHours, isToday, isTomorrow, isYesterday } from 'date-fns';

interface DateStatusIndicatorProps {
  date: string | Date;
  startTime?: string | Date;
  endTime?: string | Date;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  showTimeUntil?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function EnhancedDateStatusIndicator({
  date,
  startTime,
  endTime,
  status,
  size = 'md',
  showTimeUntil = true,
  showIcon = true,
  className
}: DateStatusIndicatorProps) {
  const targetDate = new Date(date);
  const now = new Date();
  const daysUntil = differenceInDays(targetDate, now);
  const hoursUntil = differenceInHours(targetDate, now);
  
  // Determine urgency level and styling
  const getDateUrgency = () => {
    if (isToday(targetDate)) {
      const hour = new Date(startTime || date).getHours();
      if (hour < 6) return 'tonight';
      if (hour < 12) return 'morning';
      if (hour < 18) return 'afternoon';
      return 'evening';
    }
    if (isTomorrow(targetDate)) return 'tomorrow';
    if (isYesterday(targetDate)) return 'yesterday';
    if (daysUntil <= 0) return 'overdue';
    if (daysUntil === 1) return 'tomorrow';
    if (daysUntil <= 3) return 'soon';
    if (daysUntil <= 7) return 'thisWeek';
    if (daysUntil <= 30) return 'thisMonth';
    return 'future';
  };

  const urgency = getDateUrgency();

  // Professional styling configurations with meaningful colors
  const urgencyStyles = {
    overdue: {
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 animate-pulse',
      icon: Flame,
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Overdue',
      timeColor: 'text-red-700 dark:text-red-300'
    },
    tonight: {
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      icon: Moon,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Tonight',
      timeColor: 'text-blue-700 dark:text-blue-300'
    },
    morning: {
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      icon: Sunrise,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'This Morning',
      timeColor: 'text-blue-700 dark:text-blue-300'
    },
    afternoon: {
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      icon: Sun,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Today',
      timeColor: 'text-blue-700 dark:text-blue-300'
    },
    evening: {
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      icon: Sunset,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'This Evening',
      timeColor: 'text-blue-700 dark:text-blue-300'
    },
    tomorrow: {
      badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      icon: ArrowRight,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Tomorrow',
      timeColor: 'text-emerald-700 dark:text-emerald-300'
    },
    yesterday: {
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      icon: CheckCircle2,
      iconColor: 'text-gray-600 dark:text-gray-400',
      label: 'Yesterday',
      timeColor: 'text-gray-700 dark:text-gray-300'
    },
    soon: {
      badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
      icon: Zap,
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: `${daysUntil} days`,
      timeColor: 'text-amber-700 dark:text-amber-300'
    },
    thisWeek: {
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      icon: Calendar,
      iconColor: 'text-gray-600 dark:text-gray-400',
      label: `${daysUntil} days`,
      timeColor: 'text-gray-700 dark:text-gray-300'
    },
    thisMonth: {
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      icon: Calendar,
      iconColor: 'text-gray-600 dark:text-gray-400',
      label: format(targetDate, 'MMM dd'),
      timeColor: 'text-gray-700 dark:text-gray-300'
    },
    future: {
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      icon: Calendar,
      iconColor: 'text-gray-600 dark:text-gray-400',
      label: format(targetDate, 'MMM dd'),
      timeColor: 'text-gray-700 dark:text-gray-300'
    }
  };

  const config = urgencyStyles[urgency];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        className={cn(
          'inline-flex items-center font-semibold border-2 transition-all duration-300 hover:scale-105',
          config.badge,
          sizeClasses[size]
        )}
      >
        {showIcon && <Icon className={cn(iconSizes[size], config.iconColor)} />}
        <span>{config.label}</span>
      </Badge>
      
      {showTimeUntil && startTime && (
        <div className={cn("text-xs font-medium", config.timeColor)}>
          {format(new Date(startTime), 'h:mm a')}
          {endTime && (
            <>
              <span className="mx-1">-</span>
              {format(new Date(endTime), 'h:mm a')}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface UrgencyTimelineProps {
  shifts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    job: { name: string };
  }>;
  className?: string;
}

export function UrgencyTimeline({ shifts, className }: UrgencyTimelineProps) {
  const sortedShifts = shifts
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5 shifts

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Schedule</h3>
      {sortedShifts.map((shift, index) => (
        <div 
          key={shift.id}
          className="flex items-center justify-between p-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full text-sm font-bold shadow-lg">
              {index + 1}
            </div>
            <div>
              <div className="font-medium text-foreground">{shift.job.name}</div>
              <EnhancedDateStatusIndicator
                date={shift.date}
                startTime={shift.startTime}
                endTime={shift.endTime}
                status={shift.status}
                size="sm"
                showTimeUntil={true}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Enhanced status indicator for shift cards with 3D effects
interface Enhanced3DStatusBadgeProps {
  status: string;
  count?: number;
  total?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export function Enhanced3DStatusBadge({
  status,
  count,
  total,
  size = 'md',
  showCount = false,
  className
}: Enhanced3DStatusBadgeProps) {
  const statusStyles = {
    'Active': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    'Pending': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    'Completed': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    'OnHold': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700',
    'Cancelled': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
    'CRITICAL': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 animate-pulse',
    'LOW': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700',
    'GOOD': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    'FULL': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    'OVERSTAFFED': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
  };

  const defaultStyle = 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  const badgeStyle = statusStyles[status as keyof typeof statusStyles] || defaultStyle;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      className={cn(
        'inline-flex items-center gap-1.5 font-bold border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl',
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span>{status}</span>
      {showCount && count !== undefined && (
        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-bold">
          {total !== undefined ? `${count}/${total}` : count}
        </span>
      )}
    </Badge>
  );
}