import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";
import { IShiftStatsProps } from './types';

const ShiftStats: React.FC<IShiftStatsProps> = ({ assignedPersonnel }) => {
  const totalWorkers = assignedPersonnel.length;
  const workingCount = assignedPersonnel.filter(w => w.status === 'ClockedIn').length;
  const completedCount = assignedPersonnel.filter(w => w.status === 'ShiftEnded').length;
  const notStartedCount = assignedPersonnel.filter(w => w.status === 'Assigned').length;
  const onBreakCount = assignedPersonnel.filter(w => w.status === 'ClockedOut' || w.status === 'OnBreak').length;
  
  const completionPercentage = totalWorkers > 0 ? (completedCount / totalWorkers) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Shift Overview
            </CardTitle>
            <CardDescription>
              Real-time status of the shift progress
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Shift Progress</span>
            <span>{Math.round(completionPercentage)}% Complete</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{workingCount}</div>
              <div className="text-sm text-muted-foreground">Working</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{onBreakCount}</div>
              <div className="text-sm text-muted-foreground">On Break</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{notStartedCount}</div>
              <div className="text-sm text-muted-foreground">Not Started</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftStats;
