'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface UpForGrabsShift {
  id: string;
  roleCode: string;
  shift: {
    id: string;
    date: string;
    startTime: string;
    job: {
      name: string;
      location: string;
      company: {
        name: string;
      };
    };
  };
}

export default function UpForGrabsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [availableShifts, setAvailableShifts] = useState<UpForGrabsShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableShifts = async () => {
      try {
        const response = await fetch('/api/shifts/up-for-grabs');
        if (!response.ok) {
          throw new Error('Failed to fetch available shifts');
        }
        const data = await response.json();
        setAvailableShifts(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Could not fetch shifts.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableShifts();
  }, [toast]);

  const handleClaimShift = async (shiftId: string, assignmentId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim shift');
      }

      toast({
        title: 'Shift Claimed!',
        description: 'You have been successfully assigned to the shift.',
      });

      // Refresh the list
      setAvailableShifts(prev => prev.filter(s => s.id !== assignmentId));

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not claim shift.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading available shifts...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Shifts Up for Grabs</h1>
      {availableShifts.length === 0 ? (
        <p>No shifts are currently available to be claimed.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableShifts.map(assignment => (
            <Card key={assignment.id}>
              <CardHeader>
                <CardTitle>{assignment.shift.job.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{assignment.shift.job.company.name}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Role:</strong> <Badge>{assignment.roleCode}</Badge></p>
                  <p><strong>Location:</strong> {assignment.shift.job.location}</p>
                  <p><strong>Date:</strong> {format(new Date(assignment.shift.date), 'PPP')}</p>
                  <p><strong>Start Time:</strong> {format(new Date(assignment.shift.startTime), 'p')}</p>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => handleClaimShift(assignment.shift.id, assignment.id)}
                  disabled={!user}
                >
                  Claim Shift
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}