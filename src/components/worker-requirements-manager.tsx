'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Minus, 
  Settings, 
  Save, 
  X,
  Users,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import type { RoleCode } from '@/lib/types';

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
  roleName?: string;
  color?: string;
}

interface WorkerRequirementsManagerProps {
  shiftId: string;
  requirements: WorkerRequirement[];
  onRequirementsUpdate: (requirements: WorkerRequirement[]) => void;
  onAssignmentStructureChange: () => void;
  disabled?: boolean;
}

interface RoleDefinition {
  name: string;
  color: string;
  badgeClasses: string;
  description?: string;
}

export default function WorkerRequirementsManager({
  shiftId,
  requirements,
  onRequirementsUpdate,
  onAssignmentStructureChange,
  disabled = false
}: WorkerRequirementsManagerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [localRequirements, setLocalRequirements] = useState<WorkerRequirement[]>(requirements);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customRoles, setCustomRoles] = useState<Record<string, RoleDefinition>>({});

  // Sync with prop changes
  useEffect(() => {
    setLocalRequirements(requirements);
  }, [requirements]);

  // Load custom roles from localStorage or API
  useEffect(() => {
    const savedRoles = localStorage.getItem('customWorkerRoles');
    if (savedRoles) {
      try {
        setCustomRoles(JSON.parse(savedRoles));
      } catch (error) {
        console.warn('Failed to load custom roles:', error);
      }
    }
  }, []);

  // Get all available role definitions (built-in + custom)
  const getAllRoleDefinitions = (): Record<string, RoleDefinition> => {
    return { ...ROLE_DEFINITIONS, ...customRoles };
  };

  // Update requirement count
  const updateRequirementCount = (roleCode: RoleCode, newCount: number) => {
    if (newCount < 0) return;
    
    // Crew chief is always at least 1
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
        // Add new requirement
        return [...prev, {
          roleCode,
          requiredCount: newCount,
          roleName: getAllRoleDefinitions()[roleCode]?.name || roleCode,
          color: getAllRoleDefinitions()[roleCode]?.color || '#6B7280'
        }];
      }
    });
  };

  // Remove requirement (set to 0)
  const removeRequirement = (roleCode: RoleCode) => {
    if (roleCode === 'CC') {
      toast({
        title: 'Cannot Remove',
        description: 'Crew Chief is required for all shifts (minimum 1)',
        variant: 'destructive'
      });
      return;
    }

    updateRequirementCount(roleCode, 0);
  };

  // Add new role type
  const addNewRoleType = () => {
    const roleCode = prompt('Enter new role code (2-4 characters):')?.toUpperCase().trim();
    if (!roleCode) return;

    if (roleCode.length < 2 || roleCode.length > 4) {
      toast({
        title: 'Invalid Role Code',
        description: 'Role code must be 2-4 characters long',
        variant: 'destructive'
      });
      return;
    }

    if (getAllRoleDefinitions()[roleCode as RoleCode]) {
      toast({
        title: 'Role Exists',
        description: 'A role with this code already exists',
        variant: 'destructive'
      });
      return;
    }

    const roleName = prompt('Enter role name:')?.trim();
    if (!roleName) return;

    const newRole: RoleDefinition = {
      name: roleName,
      color: '#6B7280',
      badgeClasses: 'bg-gray-100 text-gray-800',
      description: 'Custom role'
    };

    const updatedCustomRoles = {
      ...customRoles,
      [roleCode]: newRole
    };

    setCustomRoles(updatedCustomRoles);
    localStorage.setItem('customWorkerRoles', JSON.stringify(updatedCustomRoles));

    // Add to requirements with count 1
    updateRequirementCount(roleCode as RoleCode, 1);

    toast({
      title: 'Role Added',
      description: `${roleName} (${roleCode}) has been added`
    });
  };

  // Save requirements to backend
  const saveRequirements = async () => {
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

      // Update parent component
      onRequirementsUpdate(localRequirements);
      
      // Trigger assignment structure change to regenerate placeholders
      onAssignmentStructureChange();

      toast({
        title: 'Requirements Updated',
        description: 'Worker requirements have been saved successfully'
      });

      setIsOpen(false);
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

  // Reset to original requirements
  const resetRequirements = () => {
    setLocalRequirements(requirements);
  };

  // Get all possible role codes (built-in + custom)
  const getAllRoleCodes = (): RoleCode[] => {
    return Object.keys(getAllRoleDefinitions()) as RoleCode[];
  };

  // Check if requirements have changed
  const hasChanges = JSON.stringify(localRequirements) !== JSON.stringify(requirements);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" disabled={disabled}>
          <Settings className="h-4 w-4" />
          Manage Requirements
          {hasChanges && <Badge variant="destructive" className="ml-1">•</Badge>}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Requirements Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Requirements */}
          <div>
            <h3 className="text-lg font-medium mb-3">Current Requirements</h3>
            <div className="space-y-3">
              {getAllRoleCodes().map(roleCode => {
                const requirement = localRequirements.find(req => req.roleCode === roleCode);
                const count = requirement?.requiredCount || 0;
                const roleDefinition = getAllRoleDefinitions()[roleCode];
                
                if (!roleDefinition) return null;

                return (
                  <div key={roleCode} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={roleDefinition.badgeClasses}>
                        {roleCode}
                      </Badge>
                      <div>
                        <div className="font-medium">{roleDefinition.name}</div>
                        {roleDefinition.description && (
                          <div className="text-sm text-gray-500">{roleDefinition.description}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRequirementCount(roleCode, Math.max(0, count - 1))}
                        disabled={isUpdating || (roleCode === 'CC' && count <= 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <div className="w-12 text-center font-medium">
                        {count}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRequirementCount(roleCode, count + 1)}
                        disabled={isUpdating}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      {roleCode !== 'CC' && count > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRequirement(roleCode)}
                          disabled={isUpdating}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Role */}
          <div className="border-t pt-4">
            <Button
              onClick={addNewRoleType}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isUpdating}
            >
              <Plus className="h-4 w-4" />
              Add Custom Role Type
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Create custom worker role types for specialized positions
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm space-y-1">
              <div>Total positions: {localRequirements.reduce((sum, req) => sum + req.requiredCount, 0)}</div>
              <div>Active role types: {localRequirements.filter(req => req.requiredCount > 0).length}</div>
              {hasChanges && (
                <div className="text-orange-600 font-medium">⚠️ You have unsaved changes</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              onClick={resetRequirements}
              variant="outline"
              disabled={isUpdating || !hasChanges}
            >
              Reset Changes
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                disabled={isUpdating}
              >
                Cancel
              </Button>
              
              <Button
                onClick={saveRequirements}
                disabled={isUpdating || !hasChanges}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Requirements
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
