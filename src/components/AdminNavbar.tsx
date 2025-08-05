"use client"

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Users, Settings, LayoutDashboard, Building, Calendar, FileText } from "lucide-react";

const adminNavLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', icon: Building },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/jobs-shifts', label: 'Jobs & Shifts', icon: Calendar },
  { href: '/timesheets', label: 'Timesheets', icon: FileText },
  { href: '/admin/settings', label: 'Admin Settings', icon: Settings },
];

export function AdminNavbar() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-surface/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 py-2 overflow-x-auto">
          {adminNavLinks.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-foreground/70 hover:text-foreground hover:bg-surface'
                )}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}