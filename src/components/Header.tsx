"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { Home, Briefcase, Calendar, Users, LogOut, Building, FileText, Settings, LayoutDashboard } from "lucide-react"
import { signOut } from 'next-auth/react'
import { MobileNavMenu } from './MobileNavMenu'
import { ThemeSwitcher } from './theme-switcher'
import { MobileProfileNav } from './mobile-profile-nav'
import { UserNav } from './user-nav'
import React from 'react'
import { useUser } from "@/hooks/use-user"
import { UserRole } from '@prisma/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser'] },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, roles: ['Admin', 'Manager', 'CrewChief', 'CompanyUser'] },
  { href: '/shifts', label: 'Shifts', icon: Calendar, roles: ['Admin', 'Manager', 'CrewChief', 'Staff'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['Admin', 'Manager'] },
];

const adminNavItems = [
  { href: '/companies', label: 'Companies', icon: Building, roles: ['Admin'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['Admin'] },
  { href: '/timesheets', label: 'Timesheets', icon: FileText, roles: ['Admin'] },
  { href: '/admin/settings', label: 'Admin Settings', icon: Settings, roles: ['Admin'] },
];

export default function Header({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { user, status } = useUser();
  
  // Authentication is working properly - debug logging removed

  // Combine nav items based on user role
  const getVisibleNavItems = () => {
    if (!user) return navItems;
    
    const userRole = user.role as string;
    let mainItems = navItems.filter(item => item.roles.includes(userRole));
    
    // For admin users, redirect jobs and shifts to admin pages
    if (userRole === 'Admin') {
      mainItems = mainItems.map(item => {
        if (item.href === '/jobs') {
          return { ...item, href: '/admin/jobs' };
        }
        if (item.href === '/shifts') {
          return { ...item, href: '/admin/shifts' };
        }
        return item;
      });
      
      return [...mainItems, ...adminNavItems];
    }
    
    return mainItems;
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center">
          <div className="mr-4 flex">
            <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-foreground text-xl">
                HoliTime
              </span>
            </Link>
            
            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden lg:flex items-center gap-4 text-sm">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-foreground/70 hover:text-foreground hover:bg-surface'
                    )}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {children}
            </div>
            <div className="flex items-center space-x-2">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-2">
                <ThemeSwitcher />
                <UserNav />
              </div>
              {/* Mobile Navigation */}
              <div className="flex lg:hidden items-center space-x-2">
                <MobileProfileNav />
                <MobileNavMenu />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
