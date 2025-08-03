'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button'
;
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Loader2, Database, Users, Clock, Briefcase, Building } from "lucide-react";

interface DeletionImpact {
  timeEntries: number;
  assignedPersonnel: number;
  shifts: number;
  jobs: number;
  crewChiefPermissions: number;
  users: number;
}

interface CascadeDeleteDialogProps {
  entityType: 'company' | 'job' | 'shift';
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export function CascadeDeleteDialog({
  entityType,
  entityId,
  entityName,
  onSuccess,
  redirectTo,
  className
}: CascadeDeleteDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Only show for admins/managers
  if (session?.user?.role !== UserRole.Admin) {
    return null;
  }

  const fetchImpact = async () => {
    setIsLoadingImpact(true);
    try {
      const response = await fetch(`/api/cascade-delete/${entityType}/${entityId}`);
      if (response.ok) {
        const data = await response.json();
        setImpact(data.impact);
      } else {
        throw new Error('Failed to fetch deletion impact');
      }
    } catch (error) {
      console.error('Error fetching deletion impact:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deletion impact',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingImpact(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmed || confirmationText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type "DELETE" to confirm',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cascade-delete/${entityType}/${entityId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true, confirmationText }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message,
        });
        
        setIsOpen(false);
        
        if (onSuccess) {
          onSuccess();
        }
        
        if (redirectTo) {
          router.push(redirectTo);
        }
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'company':
        return 'Company';
      case 'job':
        return 'Job';
      case 'shift':
        return 'Shift';
      default:
        return 'Entity';
    }
  };

  const getWarningMessage = () => {
    switch (entityType) {
      case 'company':
        return `This will permanently delete ${entityName} and ALL associated jobs, shifts, worker assignments, and time records. This action cannot be undone.`;
      case 'job':
        return `This will permanently delete ${entityName} and ALL associated shifts, worker assignments, and time records. This action cannot be undone.`;
      case 'shift':
        return `This will permanently delete this shift and ALL associated worker assignments and time records. This action cannot be undone.`;
      default:
        return 'This action cannot be undone.';
    }
  };

  const getImpactItems = () => {
    if (!impact) return [];
    
    const items = [];
    if (impact.jobs > 0) items.push({ label: 'Jobs', count: impact.jobs, icon: Briefcase });
    if (impact.shifts > 0) items.push({ label: 'Shifts', count: impact.shifts, icon: Clock });
    if (impact.assignedPersonnel > 0) items.push({ label: 'Worker Assignments', count: impact.assignedPersonnel, icon: Users });
    if (impact.timeEntries > 0) items.push({ label: 'Time Entries', count: impact.timeEntries, icon: Database });
    if (impact.crewChiefPermissions > 0) items.push({ label: 'Crew Chief Permissions', count: impact.crewChiefPermissions, icon: Users });
    if (impact.users > 0) items.push({ label: 'User References', count: impact.users, icon: Users });
    
    return items;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchImpact();
      setConfirmationText('');
      setConfirmed(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className={className}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete {getEntityTypeLabel()}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {getEntityTypeLabel()}: {entityName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {getWarningMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Deletion Impact */}
          {isLoadingImpact ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Calculating deletion impact...</span>
                </div>
              </CardContent>
            </Card>
          ) : impact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Deletion Impact</CardTitle>
                <CardDescription>
                  The following data will be permanently deleted:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {getImpactItems().map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <Badge variant="destructive">{item.count}</Badge>
                      </div>
                    );
                  })}
                </div>
                {getImpactItems().length === 0 && (
                  <p className="text-sm text-muted-foreground">No associated data found.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Confirmation Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Confirmation Required</CardTitle>
              <CardDescription>
                Type <strong>DELETE</strong> to confirm this action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="confirmation">Type "DELETE" to confirm</Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => {
                    setConfirmationText(e.target.value);
                    setConfirmed(e.target.value === 'DELETE');
                  }}
                  placeholder="DELETE"
                  className="mt-1"
                />
              </div>
              
              {entityType === 'company' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Double Confirmation Required for Company Deletion
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Company deletion has the highest impact and affects the most data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!confirmed || isDeleting || isLoadingImpact}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {getEntityTypeLabel()}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
