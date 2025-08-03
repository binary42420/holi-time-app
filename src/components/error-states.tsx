'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  FileX,
  WifiOff,
  Shield,
  Clock
} from "lucide-react"

interface ErrorStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "An unexpected error occurred. Please try again.",
  action,
  type = 'error',
  className = ''
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return AlertTriangle
      case 'info':
        return Clock
      default:
        return XCircle
    }
  }

  const getColors = () => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-red-600'
    }
  }

  const Icon = getIcon()

  return (
    <div className={className}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <Icon size={48} className={getColors()} />
          <div className="flex flex-col items-center gap-1 text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action && (
            <Button onClick={action.onClick}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface NotFoundStateProps {
  title?: string
  description?: string
  backUrl?: string
  backLabel?: string
  className?: string
}

export function NotFoundState({ 
  title = "Not Found", 
  description = "The item you're looking for doesn't exist or has been removed.",
  backUrl = "/",
  backLabel = "Go Back",
  className = ''
}: NotFoundStateProps) {
  return (
    <div className={className}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <FileX size={48} className="text-gray-500" />
          <div className="flex flex-col items-center gap-1 text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button asChild>
            <Link href={backUrl}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface PermissionDeniedStateProps {
  title?: string
  description?: string
  className?: string
}

export function PermissionDeniedState({ 
  title = "Access Denied", 
  description = "You don't have permission to view this content.",
  className = ''
}: PermissionDeniedStateProps) {
  return (
    <div className={className}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <Shield size={48} className="text-red-600" />
          <div className="flex flex-col items-center gap-1 text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface NetworkErrorStateProps {
  onRetry?: () => void
  className?: string
}

export function NetworkErrorState({ onRetry, className = '' }: NetworkErrorStateProps) {
  return (
    <div className={className}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <WifiOff size={48} className="text-gray-500" />
          <div className="flex flex-col items-center gap-1 text-center">
            <CardTitle>Connection Error</CardTitle>
            <CardDescription>
              Unable to connect to the server. Please check your internet connection and try again.
            </CardDescription>
          </div>
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface InlineErrorProps {
  message: string
  onDismiss?: () => void
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export function InlineError({ 
  message, 
  type = 'error',
  className = ''
}: InlineErrorProps) {
  const getVariant = () => {
    switch (type) {
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'destructive'
    }
  }

  return (
    <Alert variant={getVariant()} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{type.charAt(0).toUpperCase() + type.slice(1)}</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon = FileX,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Icon className="h-12 w-12 text-gray-400" />
      <h3 className="text-lg font-medium mt-4">{title}</h3>
      <p className="text-muted-foreground mt-1">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
