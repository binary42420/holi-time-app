"use client"

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from "@/hooks/use-user"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, status } = useUser()
  const isLoading = status === 'loading'
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if we're still loading or already on login page
    if (isLoading || pathname === '/login') {
      return
    }

    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login')
      return
    }
  }, [user, isLoading, router, pathname])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Don't render children if not authenticated (will redirect)
  if (!user && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
