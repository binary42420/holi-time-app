import React from 'react';
import { StatusBadge, getFulfillmentStatus } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  Clock, 
  Briefcase,
  CheckCircle2,
  AlertTriangle 
} from "lucide-react";

/**
 * Quick Start Example: Enhancing Existing JobCard with Status Badges
 * 
 * This shows how to quickly integrate the new status system into
 * your existing components with minimal changes.
 */

interface QuickStartJobCardProps {
  job: {
    id: string;
    name: string;
    status: string;
    company: { name: string; };
    recentShifts?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      requiredCrewChiefs: number;
      requiredStagehands: number;
      requiredForkOperators: number;
      requiredReachForkOperators: number;
      requiredRiggers: number;
      requiredGeneralLaborers: number;
      assignedPersonnel?: Array<{
        id: string;
        status: string;
        user: { name: string; };
      }>;
    }>;
  };
}

export function QuickStartJobCard({ job }: QuickStartJobCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {job.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {job.company.name}
            </p>
          </div>
          
          {/* ✨ NEW: Enhanced status badge instead of simple text */}
          <StatusBadge status={job.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recent Shifts with Enhanced Status Indicators */}
        {job.recentShifts && job.recentShifts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Shifts</h4>
            {job.recentShifts.slice(0, 3).map(shift => {
              // Calculate staffing requirements
              const required = (shift.requiredCrewChiefs || 0) + 
                              (shift.requiredStagehands || 0) + 
                              (shift.requiredForkOperators || 0) + 
                              (shift.requiredReachForkOperators || 0) + 
                              (shift.requiredRiggers || 0) + 
                              (shift.requiredGeneralLaborers || 0);
              
              const assigned = shift.assignedPersonnel?.length || 0;
              
              // ✨ NEW: Use the enhanced fulfillment status calculation
              const fulfillmentStatus = getFulfillmentStatus(assigned, required);
              
              return (
                <div key={shift.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(shift.date).toLocaleDateString()}</span>
                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                    <span>{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* ✨ NEW: Show shift status */}
                    <StatusBadge status={shift.status} size="sm" />
                    
                    {/* ✨ NEW: Show fulfillment status with count */}
                    <StatusBadge 
                      status={fulfillmentStatus}
                      count={assigned}
                      total={required}
                      showCount
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* ✨ NEW: Quick Status Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {job.recentShifts?.length || 0} shifts
            </span>
          </div>
          
          {/* Show alerts for critical conditions */}
          {job.recentShifts?.some(shift => {
            const required = (shift.requiredCrewChiefs || 0) + 
                            (shift.requiredStagehands || 0) + 
                            (shift.requiredForkOperators || 0) + 
                            (shift.requiredReachForkOperators || 0) + 
                            (shift.requiredRiggers || 0) + 
                            (shift.requiredGeneralLaborers || 0);
            const assigned = shift.assignedPersonnel?.length || 0;
            return getFulfillmentStatus(assigned, required) === 'CRITICAL';
          }) && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Understaffed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick Start Worker Status Example
 * 
 * Shows how to quickly enhance worker status displays
 */

interface QuickStartWorkerStatusProps {
  workers: Array<{
    id: string;
    name: string;
    status: string;
    roleCode: string;
  }>;
}

export function QuickStartWorkerStatus({ workers }: QuickStartWorkerStatusProps) {
  // Group workers by status for better visualization
  const workersByStatus = workers.reduce((acc, worker) => {
    acc[worker.status] = (acc[worker.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ✨ NEW: Status breakdown with enhanced badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(workersByStatus).map(([status, count]) => (
            <div key={status} className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="mb-2">
                <StatusBadge status={status} />
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground">Workers</div>
            </div>
          ))}
        </div>
        
        {/* ✨ NEW: Individual worker list with status badges */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Individual Workers</h4>
          <div className="space-y-1">
            {workers.slice(0, 5).map(worker => (
              <div key={worker.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                    {worker.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="font-medium">{worker.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* ✨ NEW: Role badge */}
                  <Badge variant="outline" className="text-xs">
                    {worker.roleCode}
                  </Badge>
                  
                  {/* ✨ NEW: Status badge */}
                  <StatusBadge status={worker.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick Start Dashboard Summary
 * 
 * Simple dashboard enhancement example
 */

interface QuickStartDashboardProps {
  metrics: {
    activeJobs: number;
    todayShifts: number;
    workingNow: number;
    pendingTimesheets: number;
    understaffedShifts: number;
    noShows: number;
  };
}

export function QuickStartDashboard({ metrics }: QuickStartDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Jobs */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
              <p className="text-2xl font-bold">{metrics.activeJobs}</p>
            </div>
            <StatusBadge status="Active" showIcon={false} />
          </div>
        </CardContent>
      </Card>

      {/* Today's Shifts */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Shifts</p>
              <p className="text-2xl font-bold">{metrics.todayShifts}</p>
            </div>
            {metrics.understaffedShifts > 0 && (
              <StatusBadge status="CRITICAL" count={metrics.understaffedShifts} showCount pulse />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Working Now */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Working Now</p>
              <p className="text-2xl font-bold">{metrics.workingNow}</p>
            </div>
            <StatusBadge status="ClockedIn" showIcon={false} />
          </div>
        </CardContent>
      </Card>

      {/* Pending Timesheets */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Timesheets</p>
              <p className="text-2xl font-bold">{metrics.pendingTimesheets}</p>
            </div>
            {metrics.pendingTimesheets > 10 && (
              <StatusBadge status="PENDING_COMPANY_APPROVAL" pulse />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example usage with mock data
export function QuickStartExamplePage() {
  const mockMetrics = {
    activeJobs: 12,
    todayShifts: 8,
    workingNow: 24,
    pendingTimesheets: 15,
    understaffedShifts: 3,
    noShows: 1
  };

  const mockWorkers = [
    { id: '1', name: 'John Smith', status: 'ClockedIn', roleCode: 'CC' },
    { id: '2', name: 'Jane Doe', status: 'OnBreak', roleCode: 'SH' },
    { id: '3', name: 'Bob Wilson', status: 'Assigned', roleCode: 'FO' },
    { id: '4', name: 'Alice Brown', status: 'ShiftEnded', roleCode: 'RG' },
    { id: '5', name: 'Tom Davis', status: 'NoShow', roleCode: 'GL' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Quick Start Examples</h1>
      
      <QuickStartDashboard metrics={mockMetrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickStartWorkerStatus workers={mockWorkers} />
        
        {/* Add more examples as needed */}
      </div>
    </div>
  );
}