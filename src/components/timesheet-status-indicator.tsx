'use client'

import { Badge } from '@/components/ui/badge'

import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Clock, 
  FileText, 
  UserCheck, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Loader2
} from "lucide-react"

interface TimesheetStatusIndicatorProps {
  status: string
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TimesheetStatusIndicator({ 
  status, 
  showProgress = false, 
  size = 'md',
  className = '' 
}: TimesheetStatusIndicatorProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          icon: FileText,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          progress: 10,
          description: 'Timesheet is being prepared'
        }
      case 'PENDING_COMPANY_APPROVAL':
        return {
          label: 'Pending Company Approval',
          variant: 'default' as const,
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          progress: 40,
          description: 'Waiting for company to review and approve'
        }
      case 'PENDING_MANAGER_APPROVAL':
        return {
          label: 'Pending Manager Approval',
          variant: 'secondary' as const,
          icon: UserCheck,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          progress: 70,
          description: 'Waiting for manager final approval'
        }
      case 'COMPLETED':
        return {
          label: 'Completed',
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          progress: 100,
          description: 'Timesheet fully approved and finalized'
        }
      case 'REJECTED':
        return {
          label: 'Rejected',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          progress: 0,
          description: 'Timesheet has been rejected'
        }
      case 'pending approval':
        return {
          label: 'Pending Approval',
          variant: 'default' as const,
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          progress: 30,
          description: 'Timesheet submitted for approval'
        }
      case 'pending company approval':
        return {
          label: 'Pending Company Approval',
          variant: 'default' as const,
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          progress: 40,
          description: 'Waiting for company approval'
        }
      default:
        return {
          label: status,
          variant: 'outline' as const,
          icon: AlertCircle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          progress: 0,
          description: 'Unknown status'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  if (size === 'sm') {
    return (
      <Badge variant={config.variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  if (size === 'lg' && showProgress) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <div className="font-semibold">{config.label}</div>
                <div className="text-sm text-muted-foreground">{config.description}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{config.progress}%</span>
              </div>
              <Progress value={config.progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    </div>
  )
}

interface TimesheetWorkflowIndicatorProps {
  currentStatus: string
  className?: string
}

export function TimesheetWorkflowIndicator({ currentStatus, className = '' }: TimesheetWorkflowIndicatorProps) {
  const steps = [
    { key: 'DRAFT', label: 'Draft', icon: FileText },
    { key: 'PENDING_COMPANY_APPROVAL', label: 'Company Review', icon: Clock },
    { key: 'PENDING_MANAGER_APPROVAL', label: 'Manager Approval', icon: UserCheck },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle }
  ]

  const getCurrentStepIndex = () => {
    const index = steps.findIndex(step => step.key === currentStatus.toUpperCase())
    return index >= 0 ? index : 0
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="font-medium text-sm text-muted-foreground">Approval Workflow</h4>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = index === currentStepIndex
          const isCompleted = index < currentStepIndex
          const isPending = index > currentStepIndex

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2
                ${isActive ? 'border-blue-500 bg-blue-50' : ''}
                ${isCompleted ? 'border-green-500 bg-green-50' : ''}
                ${isPending ? 'border-gray-300 bg-gray-50' : ''}
              `}>
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className={`
                  text-sm font-medium
                  ${isActive ? 'text-blue-600' : ''}
                  ${isCompleted ? 'text-green-600' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>
                  {step.label}
                </div>
                {isActive && (
                  <div className="text-xs text-muted-foreground">In progress</div>
                )}
                {isCompleted && (
                  <div className="text-xs text-green-600">Completed</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TimesheetStatusIndicator
