import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { UnifiedStatusBadge, getFulfillmentStatus, getPriorityBadge } from '@/components/ui/unified-status-badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  UserCheck, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { formatDistance, format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getWorkersNeeded, calculateShiftRequirements, calculateAssignedWorkers } from '@/lib/worker-count-utils';
import { ROLE_DEFINITIONS } from '@/lib/constants';

interface EnhancedShiftCardProps {
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    location?: string;
    description?: string;
    requiredCrewChiefs: number;
    requiredStagehands: number;
    requiredForkOperators: number;
    requiredReachForkOperators: number;
    requiredRiggers: number;
    requiredGeneralLaborers: number;
    assignedPersonnel?: Array<{
      id: string;
      status: string;
      roleCode: string;
      user: {
        id: string;
        name: string;
        avatarUrl?: string;
      };
    }>;
    job: {
      id: string;
      name: string;
      company: {
        name: string;
      };
    };
  };
  onView?: (shiftId: string) => void;
  onEdit?: (shiftId: string) => void;
  className?: string;
}

const roleRequirements = [
  { code: 'CC', label: 'Crew Chief', key: 'requiredCrewChiefs' },
  { code: 'SH', label: 'Stagehand', key: 'requiredStagehands' },
  { code: 'FO', label: 'Fork Op.', key: 'requiredForkOperators' },
  { code: 'RFO', label: 'Rough Fork', key: 'requiredReachForkOperators' },
  { code: 'RG', label: 'Rigger', key: 'requiredRiggers' },
  { code: 'GL', label: 'Gen. Labor', key: 'requiredGeneralLaborers' }
];

export function EnhancedShiftCard({ shift, onView, onEdit, className }: EnhancedShiftCardProps) {
  // Use shared calculation functions for consistency
  const totalRequired = calculateShiftRequirements(shift);
  const totalAssigned = calculateAssignedWorkers(shift);
  const workingCount = shift.assignedPersonnel?.filter(p => p.status === 'ClockedIn').length || 0;
  const completedCount = shift.assignedPersonnel?.filter(p => p.status === 'ShiftEnded').length || 0;
  const noShowCount = shift.assignedPersonnel?.filter(p => p.status === 'NoShow').length || 0;
  
  // Calculate fulfillment and progress
  const fulfillmentStatus = getFulfillmentStatus(totalAssigned, totalRequired);
  const isOverstaffed = totalAssigned > totalRequired;
  const fulfillmentPercentage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;
  const workProgress = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;
  
  // Time calculations
  const shiftDate = new Date(shift.date);
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const daysUntil = differenceInDays(shiftDate, new Date());
  const priorityStatus = getPriorityBadge(daysUntil);
  
  // Determine if shift is urgent/critical
  const isUrgent = daysUntil <= 1 && fulfillmentStatus === 'CRITICAL';
  const isToday = daysUntil === 0;
  
  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-300 border-l-4',
      isUrgent ? 'border-l-red-500 hover:shadow-red-500/20' : 
      isToday ? 'border-l-amber-500 hover:shadow-amber-500/20' :
      fulfillmentStatus === 'OVERSTAFFED_HIGH' ? 'border-l-red-500 hover:shadow-red-500/20' :
      fulfillmentStatus === 'OVERSTAFFED_MEDIUM' ? 'border-l-orange-500 hover:shadow-orange-500/20' :
      fulfillmentStatus === 'OVERSTAFFED_LOW' ? 'border-l-yellow-500 hover:shadow-yellow-500/20' :
      fulfillmentStatus === 'FULL' ? 'border-l-emerald-500 hover:shadow-emerald-500/20' :
      fulfillmentStatus === 'GOOD' ? 'border-l-yellow-500 hover:shadow-yellow-500/20' :
      fulfillmentStatus === 'LOW' ? 'border-l-orange-500 hover:shadow-orange-500/20' :
      fulfillmentStatus === 'CRITICAL' ? 'border-l-red-500 hover:shadow-red-500/20' :
      'border-l-blue-500 hover:shadow-blue-500/20',
      className
    )}>
      <CardHeader className="pb-3 space-y-0">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight">{shift.job.name}</h3>
              <UnifiedStatusBadge status={shift.status} size="sm" />
              <UnifiedStatusBadge status={priorityStatus} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">{shift.job.company.name}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onView?.(shift.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit?.(shift.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Time and Location Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(shiftDate, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
          {shift.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{shift.location}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Staffing Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Staffing</span>
              <UnifiedStatusBadge 
                status={fulfillmentStatus} 
                count={totalAssigned} 
                total={totalRequired}
                showCount 
                size="sm"
              />
            </div>
            {noShowCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {noShowCount} No Show{noShowCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <Progress 
            value={isOverstaffed ? 100 : fulfillmentPercentage} 
            className={cn(
              "h-2",
              fulfillmentStatus === 'CRITICAL' && "bg-red-100",
              fulfillmentStatus === 'LOW' && "bg-orange-100", 
              fulfillmentStatus === 'GOOD' && "bg-amber-100",
              fulfillmentStatus === 'FULL' && "bg-emerald-100",
              fulfillmentStatus === 'OVERSTAFFED_LOW' && "bg-yellow-100",
              fulfillmentStatus === 'OVERSTAFFED_MEDIUM' && "bg-orange-100",
              fulfillmentStatus === 'OVERSTAFFED_HIGH' && "bg-red-100"
            )}
          />
        </div>

        {/* Role Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Role Requirements</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roleRequirements.map(role => {
              const required = shift[role.key as keyof typeof shift] as number || 0;
              const assigned = shift.assignedPersonnel?.filter(p => 
                p.roleCode === role.code && p.user?.id && p.status !== 'NoShow'
              ).length || 0;
              const roleStatus = getFulfillmentStatus(assigned, required);
              
              if (required === 0) return null;
              
              return (
                <div key={role.code} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2 py-1">
                  <span className="font-medium">{role.label}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      roleStatus === 'CRITICAL' && "bg-red-100 text-red-800",
                      roleStatus === 'LOW' && "bg-orange-100 text-orange-800",
                      roleStatus === 'GOOD' && "bg-amber-100 text-amber-800", 
                      roleStatus === 'FULL' && "bg-emerald-100 text-emerald-800",
                      roleStatus === 'OVERSTAFFED_LOW' && "bg-yellow-100 text-yellow-800",
                      roleStatus === 'OVERSTAFFED_MEDIUM' && "bg-orange-100 text-orange-800",
                      roleStatus === 'OVERSTAFFED_HIGH' && "bg-red-100 text-red-800"
                    )}
                  >
                    {assigned}/{required}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workers Needed */}
        {(() => {
          const workersNeeded = getWorkersNeeded({
            assignedPersonnel: shift.assignedPersonnel,
            requiredCrewChiefs: shift.requiredCrewChiefs,
            requiredStagehands: shift.requiredStagehands,
            requiredForkOperators: shift.requiredForkOperators,
            requiredReachForkOperators: shift.requiredReachForkOperators,
            requiredRiggers: shift.requiredRiggers,
            requiredGeneralLaborers: shift.requiredGeneralLaborers,
          });

          return workersNeeded.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Workers Still Needed
              </h4>
              <div className="flex flex-wrap gap-2">
                {workersNeeded.map((worker) => {
                  const roleDetails = ROLE_DEFINITIONS[worker.roleCode as keyof typeof ROLE_DEFINITIONS];
                  if (!roleDetails) return null;
                  return (
                    <Badge 
                      key={worker.roleCode} 
                      variant="outline"
                      className={cn(
                        "text-xs font-medium border-2",
                        roleDetails.roleColor === 'purple' && "border-purple-300 text-purple-700 bg-purple-50",
                        roleDetails.roleColor === 'blue' && "border-blue-300 text-blue-700 bg-blue-50",
                        roleDetails.roleColor === 'green' && "border-green-300 text-green-700 bg-green-50",
                        roleDetails.roleColor === 'yellow' && "border-yellow-300 text-yellow-700 bg-yellow-50",
                        roleDetails.roleColor === 'red' && "border-red-300 text-red-700 bg-red-50",
                        roleDetails.roleColor === 'gray' && "border-gray-300 text-gray-700 bg-gray-50"
                      )}
                    >
                      {worker.needed} {worker.roleName}{worker.needed > 1 ? 's' : ''}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Fully Staffed
              </h4>
              <p className="text-xs text-muted-foreground">All required positions are filled</p>
            </div>
          );
        })()}

        {/* Work Progress (if shift is active) */}
        {(shift.status === 'Active' || shift.status === 'InProgress') && totalAssigned > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Progress</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  {workingCount} Working
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  {completedCount} Done
                </span>
              </div>
            </div>
            <Progress value={workProgress} className="h-2" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {daysUntil === 0 ? 'Today' : 
             daysUntil === 1 ? 'Tomorrow' :
             daysUntil > 0 ? `In ${daysUntil} days` : 
             `${Math.abs(daysUntil)} days ago`}
          </div>
          
          <Link href={`/jobs-shifts/${shift.id}`}>
            <Button variant="outline" size="sm" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}