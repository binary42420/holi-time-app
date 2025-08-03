import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/Avatar';
import { 
  Menu,
  Home,
  Calendar,
  Users,
  Briefcase,
  FileText,
  Building2,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: {
    count?: number;
    status?: string;
    pulse?: boolean;
  };
  subItems?: Array<{
    href: string;
    label: string;
    badge?: {
      count?: number;
      status?: string;
    };
  }>;
}

interface EnhancedMobileNavProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    company?: {
      name: string;
    };
  };
  navigationItems: NavigationItem[];
  notifications?: {
    unread: number;
    urgent: number;
  };
  currentPath: string;
  onSignOut: () => void;
  className?: string;
}

export function EnhancedMobileNav({ 
  user, 
  navigationItems, 
  notifications,
  currentPath, 
  onSignOut, 
  className 
}: EnhancedMobileNavProps) {
  const [open, setOpen] = React.useState(false);

  const isActivePath = (href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'CrewChief':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      case 'CompanyUser':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("relative", className)}
        >
          <Menu className="h-5 w-5" />
          {notifications && notifications.urgent > 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-white animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          <SheetHeader className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar
                  name={user.name}
                  userId={user.id}
                  size="lg"
                  className="h-14 w-14"
                />
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-left text-lg font-semibold truncate">
                  {user.name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-xs", getRoleBadgeColor(user.role))}>
                    {user.role}
                  </Badge>
                  {notifications && notifications.unread > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Bell className="h-3 w-3 mr-1" />
                      {notifications.unread}
                    </Badge>
                  )}
                </div>
                {user.company && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {user.company.name}
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <div key={item.href}>
                    <Link 
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <>
                            {item.badge.count !== undefined && item.badge.count > 0 && (
                              <Badge 
                                variant={isActive ? "secondary" : "default"}
                                className={cn(
                                  "text-xs min-w-[20px] h-5 flex items-center justify-center",
                                  item.badge.pulse && "animate-pulse"
                                )}
                              >
                                {item.badge.count > 99 ? '99+' : item.badge.count}
                              </Badge>
                            )}
                            {item.badge.status && (
                              <StatusBadge 
                                status={item.badge.status} 
                                size="sm" 
                                pulse={item.badge.pulse}
                              />
                            )}
                          </>
                        )}
                        
                        {item.subItems && (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </Link>
                    
                    {/* Sub Items */}
                    {item.subItems && isActive && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                              currentPath === subItem.href
                                ? "bg-muted text-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <span>{subItem.label}</span>
                            {subItem.badge && (
                              <div className="flex items-center gap-1">
                                {subItem.badge.count !== undefined && subItem.badge.count > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {subItem.badge.count}
                                  </Badge>
                                )}
                                {subItem.badge.status && (
                                  <StatusBadge status={subItem.badge.status} size="sm" />
                                )}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="border-t p-4 space-y-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg justify-start"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper function to create navigation items with status badges
export function createNavigationItems(metrics?: {
  activeShifts?: number;
  pendingTimesheets?: number;
  urgentShifts?: number;
  activeJobs?: number;
  understaffedShifts?: number;
}): NavigationItem[] {
  return [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
      badge: metrics?.urgentShifts ? {
        count: metrics.urgentShifts,
        pulse: true
      } : undefined
    },
    {
      href: '/shifts',
      label: 'Shifts',
      icon: Calendar,
      badge: metrics?.activeShifts ? {
        count: metrics.activeShifts,
        status: 'Active'
      } : undefined,
      subItems: [
        {
          href: '/shifts/today',
          label: 'Today\'s Shifts',
          badge: metrics?.activeShifts ? { count: metrics.activeShifts } : undefined
        },
        {
          href: '/shifts/upcoming',
          label: 'Upcoming',
          badge: metrics?.urgentShifts ? { 
            count: metrics.urgentShifts,
            status: 'URGENT' 
          } : undefined
        },
        {
          href: '/shifts/calendar',
          label: 'Calendar View'
        }
      ]
    },
    {
      href: '/workers',
      label: 'Workers',
      icon: Users,
      badge: metrics?.understaffedShifts ? {
        count: metrics.understaffedShifts,
        status: 'CRITICAL',
        pulse: true
      } : undefined
    },
    {
      href: '/jobs',
      label: 'Jobs',
      icon: Briefcase,
      badge: metrics?.activeJobs ? {
        count: metrics.activeJobs,
        status: 'Active'
      } : undefined
    },
    {
      href: '/timesheets',
      label: 'Timesheets',
      icon: FileText,
      badge: metrics?.pendingTimesheets ? {
        count: metrics.pendingTimesheets,
        status: 'PENDING_COMPANY_APPROVAL',
        pulse: metrics.pendingTimesheets > 5
      } : undefined,
      subItems: [
        {
          href: '/timesheets/pending',
          label: 'Pending Approval',
          badge: metrics?.pendingTimesheets ? { count: metrics.pendingTimesheets } : undefined
        },
        {
          href: '/timesheets/completed',
          label: 'Completed'
        },
        {
          href: '/timesheets/draft',
          label: 'Drafts'
        }
      ]
    },
    {
      href: '/companies',
      label: 'Companies',
      icon: Building2
    }
  ];
}