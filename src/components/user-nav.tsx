"use client"

import { useUser } from "@/hooks/use-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { SimpleAvatar } from "@/components/SimpleAvatar";
import { ChevronsUpDown, LogOut, User as UserIcon, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export function UserNav() {
  const { user, logout } = useUser()
  const { theme, setTheme } = useTheme()
  const onToggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-full justify-start gap-2 px-2">
          <SimpleAvatar
            src={user.avatarUrl}
            name={user.name || user.email || 'User'}
            size="sm"
            className="h-8 w-8"
          />
          <div className="hidden sm:flex sm:flex-col sm:items-start">
            <span className="text-sm font-medium">
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {user.role}
            </span>
          </div>
          <ChevronsUpDown size={16} className="hidden sm:block ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile" passHref>
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
