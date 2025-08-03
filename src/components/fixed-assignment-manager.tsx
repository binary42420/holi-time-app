'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Worker {
  id: string;
  name: string;
  email: string;
}

interface Assignment {
  id: string;
  userId: string;
  roleCode: string;
  user: Worker;
  hasTimeEntries?: boolean;
}

interface FixedAssignmentManagerProps {
  shiftId: string;
  assignments: Assignment[];
  availableWorkers: Worker[];
  onUpdate: () => void;
}

export function FixedAssignmentManager({ 
  shiftId, 
  assignments, 
  availableWorkers, 
  onUpdate 
}: FixedAssignmentManagerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Assign or replace worker
  const handleAssignWorker = async (userId: string, roleCode: string, replaceAssignmentId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assign-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roleCode,
          replaceAssignmentId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign worker');
      }

      const worker = availableWorkers.find(w => w.id === userId);
      const action = result.action === 'replaced' ? 'replaced' : 'assigned';
      
      toast({
        title: "Success",
        description: `${worker?.name} ${action} successfully`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error assigning worker:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign worker",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign worker
  const handleUnassignWorker = async (assignmentId: string, workerName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unassign worker');
      }

      toast({
        title: "Success",
        description: `${workerName} unassigned successfully`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error unassigning worker:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign worker",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get available workers (not already assigned)
  const getAvailableWorkers = () => {
    const assignedUserIds = assignments.map(a => a.userId);
    return availableWorkers.filter(worker => !assignedUserIds.includes(worker.id));
  };

  // Group assignments by role
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.roleCode]) {
      acc[assignment.roleCode] = [];
    }
    acc[assignment.roleCode].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  const roleNames = {
    CC: 'Crew Chief',
    SH: 'Stage Hand',
    FO: 'Fork Operator',
    RG: 'Rigger',
    GL: 'General Laborer'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixed Assignment Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedAssignments).map(([roleCode, roleAssignments]) => (
          <div key={roleCode} className="space-y-3">
            <h3 className="font-semibold text-lg">
              {roleNames[roleCode as keyof typeof roleNames] || roleCode} ({roleAssignments.length})
            </h3>
            
            <div className="grid gap-3">
              {roleAssignments.map((assignment) => (
                <Card key={assignment.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{assignment.user.name}</div>
                        <div className="text-sm text-muted-foreground">{assignment.user.email}</div>
                        {assignment.hasTimeEntries && (
                          <div className="text-xs text-orange-600">Has time entries</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Replace worker dropdown */}
                      <Select 
                        onValueChange={(userId) => handleAssignWorker(userId, roleCode, assignment.id)}
                        disabled={isLoading || assignment.hasTimeEntries}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Replace..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableWorkers().map(worker => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Unassign button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassignWorker(assignment.id, assignment.user.name)}
                        disabled={isLoading || assignment.hasTimeEntries}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Add new assignment slot */}
              <Card className="p-3 border-dashed">
                <Select 
                  onValueChange={(userId) => handleAssignWorker(userId, roleCode)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableWorkers().map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default FixedAssignmentManager;
