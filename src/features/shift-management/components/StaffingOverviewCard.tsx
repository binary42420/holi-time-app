"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserPlus, Crown } from "lucide-react";
import { Shift, Assignment } from "@/lib/types";
import { Progress } from "@/components/ui/progress";

interface WorkerRequirement {
  roleCode: string;
  requiredCount: number;
}

interface StaffingOverviewCardProps {
  shift: Shift;
  assignments: Assignment[];
  dynamicRequirements?: WorkerRequirement[];
}

export function StaffingOverviewCard({ shift, assignments }: StaffingOverviewCardProps) {
  const assignedWorkers = assignments.filter((p) => p.user && p.userId);
  const assignedCount = assignedWorkers.length;
  
  // Calculate total required workers from shift requirements
  const totalRequired = (shift.requiredCrewChiefs || 0) + 
                       (shift.requiredStagehands || 0) + 
                       (shift.requiredForkOperators || 0) + 
                       (shift.requiredReachForkOperators || 0) + 
                       (shift.requiredRiggers || 0) + 
                       (shift.requiredGeneralLaborers || 0);
  
  const requested = totalRequired || shift.requestedWorkers || 0;
  const progress = requested > 0 ? (assignedCount / requested) * 100 : 0;

  const getStaffingStatus = () => {
    if (assignedCount >= requested) {
      return <Badge color="green">Fully Staffed</Badge>;
    } else if (assignedCount > 0) {
      return <Badge color="yellow">Partially Staffed</Badge>;
    } else {
      return <Badge color="red">Unstaffed</Badge>;
    }
  };

  const getCrewChief = () => {
    const crewChief = assignedWorkers.find((person: any) => person.roleCode === 'CC');
    return crewChief ? crewChief.user?.name : 'Unassigned';
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">Staffing Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            {getStaffingStatus()}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Staffing Level</span>
              <span className="font-medium">{`${assignedCount} / ${requested}`}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Assigned:</span>
              <span className="font-medium">{assignedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Requested:</span>
              <span className="font-medium">{requested}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Crew Chief:</span>
            <span className="font-medium">{getCrewChief()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}