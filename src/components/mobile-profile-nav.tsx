"use client"

import React from 'react';
import Link from 'next/link';
import { useUser } from "@/hooks/use-user";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { 
  LogOut, 
  User as UserIcon, 
  Sun, 
  Moon, 
  Settings,
  ChevronDown,
  Menu
} from "lucide-react";

interface MobileProfileNavProps {
  className?: string;
}

export function MobileProfileNav({ className = "" }: MobileProfileNavProps) {
  const { user, logout } = useUser();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };



  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Theme Toggle - Mobile First */}
      <Button
        size="sm"
        onClick={toggleTheme}
        className="h-9 w-9 p-0 hover:bg-surface-2 text-foreground-secondary hover:text-foreground"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 px-2 hover:bg-surface-2 focus:bg-surface-2 data-[state=open]:bg-surface-2"
            aria-label="User menu"
          >
            <div className="flex items-center gap-2">
              <Avatar
                name={user.name || user.email || 'User'}
                userId={user.id}
                size="sm"
                enableSmartCaching={true}
                className="h-7 w-7 ring-2 ring-border-2"
              />
              
              {/* Show name on larger screens */}
              <div className="hidden sm:flex sm:flex-col sm:items-start sm:min-w-0">
                <span className="text-sm font-medium text-foreground truncate max-w-24 lg:max-w-32">
                  {user.name || 'User'}
                </span>
                <span className="text-xs text-foreground-muted truncate max-w-24 lg:max-w-32">
                  {user.role || 'Staff'}
                </span>
              </div>
              
              <ChevronDown className="h-3 w-3 text-foreground-muted hidden sm:block" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent
          className="w-64 bg-surface border-border"
          align="end"
          forceMount
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal p-3">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">
                {user.name || 'User'}
              </p>
              <p className="text-xs leading-none text-foreground-secondary">
                {user.email}
              </p>
              <p className="text-xs leading-none text-foreground-muted">
                {user.role || 'Staff'}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-surface-2 focus:bg-surface-2">
            <Link href="/profile" className="flex items-center w-full">
              <UserIcon className="mr-3 h-4 w-4 text-foreground-secondary" />
              <span className="text-foreground">Profile</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-surface-2 focus:bg-surface-2">
            <Link href="/settings" className="flex items-center w-full">
              <Settings className="mr-3 h-4 w-4 text-foreground-secondary" />
              <span className="text-foreground">Settings</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={toggleTheme}
            className="cursor-pointer hover:bg-surface-2 focus:bg-surface-2"
          >
            {theme === 'dark' ? (
              <Sun className="mr-3 h-4 w-4 text-foreground-secondary" />
            ) : (
              <Moon className="mr-3 h-4 w-4 text-foreground-secondary" />
            )}
            <span className="text-foreground">
              {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer hover:bg-error/10 focus:bg-error/10 text-error focus:text-error"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
