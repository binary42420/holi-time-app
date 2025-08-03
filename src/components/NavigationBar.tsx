"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useLoading } from '@/providers/loading-provider';
import { 
  BriefcaseIcon, 
  CalendarDaysIcon, 
  UsersGroupIcon, 
  BuildingOfficeIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  CogIcon
} from './IconComponents';

export type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles: string[];
  exact?: boolean;
};

interface NavigationBarProps {
  className?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const { user } = useUser();
  const { startLoading } = useLoading();

  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <SparklesIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser'],
      exact: true
    },
    {
      name: 'Jobs',
      href: '/jobs',
      icon: <BriefcaseIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief', 'CompanyUser']
    },
    {
      name: 'Shifts',
      href: '/shifts',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief', 'Staff']
    },
    {
      name: 'Employees',
      href: '/employees',
      icon: <UsersGroupIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager']
    },
    {
      name: 'Companies',
      href: '/companies',
      icon: <BuildingOfficeIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief']
    },
    {
      name: 'Timesheets',
      href: '/timesheets',
      icon: <ClockIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser']
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: <DocumentTextIcon className="h-5 w-5" />,
      allowedRoles: ['Admin', 'Manager', 'CrewChief', 'Staff', 'CompanyUser']
    },
    {
      name: 'Admin',
      href: '/admin-panel',
      icon: <CogIcon className="h-5 w-5" />,
      allowedRoles: ['Admin']
    }
  ];

  // Filter and map navigation items based on user role
  const allowedItems = navigationItems
    .filter(item => user && item.allowedRoles.includes(user.role))
    .map(item => {
      // Admin users will now use the standard pages
      return item;
    });

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`border-b border-gray-700/50 bg-gradient-to-r from-gray-900 to-gray-800 ${className}`}>
      <nav className="-mb-px flex flex-wrap overflow-x-auto scrollbar-hide" aria-label="Navigation">
        {allowedItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={startLoading}
              className={`
                relative flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-all duration-300 ease-in-out
                min-w-fit whitespace-nowrap group
                ${active
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 hover:bg-gray-700/30'
                }
              `}
            >
              <div className={`
                transition-all duration-300 ease-in-out
                ${active ? 'scale-110 text-indigo-300' : 'group-hover:scale-105 group-hover:text-gray-200'}
              `}>
                {item.icon}
              </div>
              <span className={`
                ml-2 hidden sm:inline transition-all duration-300
                ${active ? 'font-semibold' : 'group-hover:font-medium'}
              `}>
                {item.name}
              </span>

              {/* Active indicator dot */}
              {active && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Hover glow effect */}
              <div className={`
                absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300
                ${active
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-100'
                  : 'group-hover:opacity-100 bg-gradient-to-r from-gray-600/20 to-gray-500/20'
                }
              `}></div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default NavigationBar;
