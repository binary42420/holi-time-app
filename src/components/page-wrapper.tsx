'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
 
 interface PageWrapperProps {
   children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}

export function PageWrapper({
  children,
  className,
  title,
  description,
  actions,
}: PageWrapperProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {(title || description || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold">{title}</h1>
                )}
                {description && (
                  <p className="text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageWrapperSkeleton() {
  return (
    <div className={cn('min-h-screen')}>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
             <Skeleton className="h-9 w-48" />
             <Skeleton className="h-5 w-64 mt-2" />
           </div>
           <Skeleton className="h-10 w-24" />
         </div>
         <Skeleton className="h-64 w-full" />
       </div>
     </main>
   </div>
 );
}