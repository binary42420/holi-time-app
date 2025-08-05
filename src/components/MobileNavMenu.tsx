"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"
import { Menu, LogOut, Home, Briefcase, Calendar, Users, Building, FileText, Settings, CalendarDays } from "lucide-react"
import { Button } from './ui/button'
import { ThemeSwitcher } from './theme-switcher'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { Separator } from './ui/separator'
import { useUser } from "@/hooks/use-user"
import { Avatar } from './Avatar'

interface MobileNavMenuProps {
  className?: string;
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser'] },
  { href: '/jobs-shifts', label: 'Scheduled Shifts', icon: CalendarDays, roles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['Admin', 'Manager'] },
  { href: '/companies', label: 'Companies', icon: Building, roles: ['Admin'] },
  { href: '/timesheets', label: 'Timesheets', icon: FileText, roles: ['Admin'] },
  { href: '/admin/settings', label: 'Admin Settings', icon: Settings, roles: ['Admin'] },
];

export function MobileNavMenu({ className }: MobileNavMenuProps) {
  const pathname = usePathname()
  const { user, status } = useUser()
  const [open, setOpen] = React.useState(false)

  // Filter nav items based on user role
  const getVisibleNavItems = () => {
    // During loading/hydration, show no items to prevent hydration mismatch
    if (status === 'loading' || !user) return [];
    
    const userRole = user.role as string;
    return allNavItems.filter(item => item.roles.includes(userRole));
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className={className}>
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-background border-r border-border">
        <SheetHeader>
          <SheetTitle className="text-left text-foreground">HoliTime</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          {user && (
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Avatar
                name={user.name || user.email || 'User'}
                userId={user.id}
                size="sm"
                enableSmartCaching={true}
                className="h-10 w-10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-foreground/60 truncate">
                  {user.email}
                </p>
                {user.role === 'Admin' && (
                  <p className="text-xs text-primary font-medium">
                    Administrator
                  </p>
                )}
              </div>
            </div>
          )}
          
          <nav className="flex flex-col gap-1 mt-4 px-2">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-hover'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-auto pb-6">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between px-4 mb-4">
              <span className="text-sm font-medium text-foreground">Theme</span>
              <ThemeSwitcher />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-hover mx-2"
              onClick={() => signOut()}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}