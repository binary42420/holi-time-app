"use client"

import React from 'react'
import { Clock, Users, MapPin, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from '@/lib/utils'

export function LoadingSpinner({ size = "md", className = "" }: { 
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string 
}) {
  const sizeMap = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }
  return (
    <Loader2 className={cn('animate-spin', sizeMap[size], className)} />
  )
}

export function ButtonLoading({ children, loading, ...props }: { 
  children: React.ReactNode
  loading: boolean
  [key: string]: any 
}) {
  return (
    <Button {...props} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

export function ShiftCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="flex space-x-2 pt-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-2/5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ShiftsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShiftCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EmployeeAssignmentSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TimesheetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(8)].map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-full" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                {[...Array(6)].map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
                <TableCell>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  className = "" 
}: { 
  steps: string[]
  currentStep: number
  className?: string 
}) {
  const progressValue = ((currentStep + 1) / steps.length) * 100;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of {steps.length}</span>
        <span>{Math.round(progressValue)}%</span>
      </div>
      <Progress value={progressValue} />
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Badge
              variant={index < currentStep ? 'default' : index === currentStep ? 'secondary' : 'outline'}
              className={cn('rounded-full h-6 w-6 flex items-center justify-center', {
                'bg-green-500': index < currentStep,
              })}
            >
              {index < currentStep ? '✓' : index + 1}
            </Badge>
            <span className={cn('text-sm', { 'font-semibold text-primary': index === currentStep, 'text-muted-foreground': index > currentStep })}>
              {step}
            </span>
            {index === currentStep && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function InlineLoading({ 
  message = "Loading...", 
  className = ""
}: { 
  message?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  )
}

export function PageLoading({ 
  title = "Loading...", 
  description = "Please wait while we load your data." 
}: { 
  title?: string
  description?: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 transition-all duration-500 ease-in-out transform hover:scale-110" />
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

export function WorkerRequirementsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-8" />
            </div>
            <div className="flex justify-center items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}

export function LoadingWithRetry({ 
  onRetry, 
  message = "Loading...", 
  error = false 
}: { 
  onRetry?: () => void
  message?: string
  error?: boolean 
}) {
  if (error && onRetry) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-destructive">Failed to load data</p>
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-2">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
