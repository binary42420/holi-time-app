'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from "lucide-react";

export type CardVariant = 'default' | 'gradient' | 'glass' | 'elevated' | 'bordered';
export type CardSize = 'sm' | 'md' | 'lg';

interface EnhancedCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  gradient?: string;
}

const cardVariants = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700',
  glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50',
  elevated: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg',
  bordered: 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
};

const sizeClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

const hoverClasses = 'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer';

export function EnhancedCard({
  children,
  variant = 'default',
  size = 'md',
  className,
  onClick,
  hoverable = !!onClick,
  icon: Icon,
  iconColor = 'text-indigo-500',
  title,
  subtitle,
  badge,
  gradient
}: EnhancedCardProps) {
  const cardClasses = cn(
    'rounded-xl transition-all duration-300 ease-in-out',
    cardVariants[variant],
    sizeClasses[size],
    hoverable && hoverClasses,
    gradient && `bg-gradient-to-br ${gradient}`,
    className
  );

  const content = (
    <>
      {(Icon || title || badge) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={cn(
                'p-2 rounded-lg',
                iconColor.includes('indigo') ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                iconColor.includes('emerald') ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                iconColor.includes('amber') ? 'bg-amber-100 dark:bg-amber-900/30' :
                iconColor.includes('red') ? 'bg-red-100 dark:bg-red-900/30' :
                iconColor.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/30' :
                'bg-gray-100 dark:bg-gray-700'
              )}>
                <Icon className={cn('h-5 w-5', iconColor)} />
              </div>
            )}
            {title && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
          {badge && (
            <div className="flex-shrink-0">
              {badge}
            </div>
          )}
        </div>
      )}
      {children}
    </>
  );

  if (onClick) {
    return (
      <div
        className={cardClasses}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
          }
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={cardClasses}>
      {content}
    </div>
  );
}

// Specialized card components
export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-indigo-500',
  className,
  onClick
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
}) {
  const changeColors = {
    positive: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    negative: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    neutral: 'text-gray-600 bg-gray-50 dark:bg-gray-700'
  };

  return (
    <EnhancedCard
      variant="elevated"
      className={className}
      onClick={onClick}
      hoverable={!!onClick}
      icon={Icon}
      iconColor={iconColor}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              changeColors[changeType]
            )}>
              {change}
            </span>
          )}
        </div>
      </div>
    </EnhancedCard>
  );
}

export function StatusCard({
  title,
  description,
  status,
  icon: Icon,
  iconColor = 'text-indigo-500',
  className,
  onClick,
  actions
}: {
  title: string;
  description?: React.ReactNode;
  status: React.ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <EnhancedCard
      variant="glass"
      className={className}
      onClick={onClick}
      hoverable={!!onClick}
      icon={Icon}
      iconColor={iconColor}
      badge={status}
    >
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          {title}
        </h4>
        {description && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </div>
        )}
        {actions && (
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            {actions}
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}

export default EnhancedCard;
