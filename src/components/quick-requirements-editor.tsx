'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  Save,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import type { RoleCode } from '@/lib/types';

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface QuickRequirementsEditorProps {
  shiftId: string;
  requirements: WorkerRequirement[];
  onRequirementsUpdate: (requirements: WorkerRequirement[]) => void;
  onAssignmentStructureChange: () => void;
  disabled?: boolean;
  className?: string;
}

export default function QuickRequirementsEditor({
  shiftId,
  requirements,
  onRequirementsUpdate,
  onAssignmentStructureChange,
  disabled = false,
  className = ''
}: QuickRequirementsEditorProps) {
  const { toast } = useToast();
  const [localRequirements, setLocalRequirements] = useState<WorkerRequirement[]>(requirements);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update requirement count
  const updateCount = (roleCode: RoleCode, newCount: number) => {
    if (newCount < 0) return;
    
    // Crew chief minimum is 1
    if (roleCode === 'CC' && newCount < 1) {
      newCount = 1;
    }

    setLocalRequirements(prev => {
      const existing = prev.find(req => req.roleCode === roleCode);
      if (existing) {
        return prev.map(req => 
          req.roleCode === roleCode 
            ? { ...req, requiredCount: newCount }
            : req
        );
      } else {
        return [...prev, { roleCode, requiredCount: newCount }];
      }
    });
  };

  // Save changes
  const saveChanges = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/worker-requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerRequirements: localRequirements })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update requirements');
      }

      onRequirementsUpdate(localRequirements);
      onAssignmentStructureChange();

      toast({
        title: 'Requirements Updated',
        description: 'Worker requirements saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update requirements',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset changes
  const resetChanges = () => {
    setLocalRequirements(requirements);
  };

  // Check if there are changes
  const hasChanges = JSON.stringify(localRequirements) !== JSON.stringify(requirements);

  // Get main role codes to display
  const mainRoles: RoleCode[] = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Quick Requirements</h4>
        <div className="flex gap-1">
          {hasChanges && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetChanges}
                disabled={isUpdating}
                className="h-7 px-2"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={isUpdating}
                className="h-7 px-2"
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {mainRoles.map(roleCode => {
          const requirement = localRequirements.find(req => req.roleCode === roleCode);
          const count = requirement?.requiredCount || 0;
          const roleDefinition = ROLE_DEFINITIONS[roleCode];
          
          if (!roleDefinition) return null;

          return (
            <div key={roleCode} className="flex items-center justify-between p-2 border rounded text-sm">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${roleDefinition.badgeClasses}`}
                >
                  {roleCode}
                </Badge>
                <span className="text-xs font-medium">{count}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateCount(roleCode, Math.max(roleCode === 'CC' ? 1 : 0, count - 1))}
                  disabled={disabled || isUpdating || (roleCode === 'CC' && count <= 1)}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateCount(roleCode, count + 1)}
                  disabled={disabled || isUpdating}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ You have unsaved changes. Click save to apply.
        </div>
      )}
    </div>
  );
}
