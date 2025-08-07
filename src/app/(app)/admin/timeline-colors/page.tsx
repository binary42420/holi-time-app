"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Palette, 
  RotateCcw, 
  Crown, 
  User, 
  Save, 
  Truck, 
  HardHat,
  AlertCircle,
  Check,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Worker type configurations
const WORKER_TYPES = {
  crew_chief: { icon: Crown, label: 'Crew Chief', defaultColor: '#7c3aed' },
  fork_operator: { icon: Truck, label: 'Fork Operator', defaultColor: '#ea580c' },
  stage_hand: { icon: HardHat, label: 'Stage Hand', defaultColor: '#2563eb' },
  general_labor: { icon: User, label: 'General Labor', defaultColor: '#6b7280' }
};

// Default crew chief colors
const DEFAULT_CREW_CHIEF_COLORS = [
  { bg: '#e11d48', light: '#fecdd3', name: 'Rose' },
  { bg: '#dc2626', light: '#fed7d7', name: 'Red' },
  { bg: '#ea580c', light: '#fed7aa', name: 'Orange' },
  { bg: '#ca8a04', light: '#fef3c7', name: 'Amber' },
  { bg: '#65a30d', light: '#d9f99d', name: 'Lime' },
  { bg: '#059669', light: '#a7f3d0', name: 'Emerald' },
  { bg: '#0891b2', light: '#a5f3fc', name: 'Cyan' },
  { bg: '#2563eb', light: '#bfdbfe', name: 'Blue' },
  { bg: '#7c3aed', light: '#c4b5fd', name: 'Violet' },
  { bg: '#c026d3', light: '#f0abfc', name: 'Fuchsia' },
  { bg: '#be185d', light: '#f9a8d4', name: 'Pink' },
  { bg: '#374151', light: '#d1d5db', name: 'Gray' }
];

// Preset colors for easy selection
const PRESET_COLORS = [
  '#e11d48', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#059669',
  '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#be185d', '#374151',
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280', '#ef4444', '#f59e0b', '#10b981', '#14b8a6'
];

interface ColorConfig {
  bg: string;
  light: string;
  name: string;
}

export default function TimelineColorsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [workerTypeColors, setWorkerTypeColors] = useState<Record<string, string>>({});
  const [crewChiefColors, setCrewChiefColors] = useState<Record<string, ColorConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';

  // Load current colors from API
  const loadColors = async () => {
    try {
      const response = await fetch('/api/timeline-colors');
      if (response.ok) {
        const data = await response.json();
        setWorkerTypeColors(data.workerTypeColors || {});
        setCrewChiefColors(data.crewChiefColors || {});
      }
    } catch (error) {
      console.error('Failed to load colors:', error);
      toast({
        title: "Error",
        description: "Failed to load current color settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save colors to API
  const saveColors = async (type: 'crew_chief' | 'worker_type', colors: any) => {
    try {
      const response = await fetch('/api/timeline-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, colors }),
      });

      if (!response.ok) {
        throw new Error('Failed to save colors');
      }

      return true;
    } catch (error) {
      console.error('Failed to save colors:', error);
      return false;
    }
  };

  // Reset all colors to defaults
  const resetAllColors = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/timeline-colors', {
        method: 'DELETE'
      });

      if (response.ok) {
        setWorkerTypeColors({});
        setCrewChiefColors({});
        setHasChanges(false);
        toast({
          title: "Colors Reset",
          description: "All timeline colors have been reset to defaults.",
        });
      } else {
        throw new Error('Failed to reset colors');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset colors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save all changes
  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      const workerTypeSuccess = await saveColors('worker_type', workerTypeColors);
      const crewChiefSuccess = await saveColors('crew_chief', crewChiefColors);

      if (workerTypeSuccess && crewChiefSuccess) {
        setHasChanges(false);
        toast({
          title: "Colors Saved",
          description: "All color changes have been saved successfully.",
        });
      } else {
        throw new Error('Failed to save some colors');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save color changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to generate light color
  const generateLightColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const lightR = Math.round(r + (255 - r) * 0.7);
    const lightG = Math.round(g + (255 - g) * 0.7);
    const lightB = Math.round(b + (255 - b) * 0.7);
    
    return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
  };

  // Update worker type color
  const updateWorkerTypeColor = (type: string, color: string) => {
    setWorkerTypeColors(prev => ({
      ...prev,
      [type]: color
    }));
    setHasChanges(true);
  };

  // Get current worker type color
  const getWorkerTypeColor = (type: string) => {
    return workerTypeColors[type] || WORKER_TYPES[type as keyof typeof WORKER_TYPES]?.defaultColor || '#6b7280';
  };

  useEffect(() => {
    if (!isAdmin) {
      router.push('/unauthorized');
      return;
    }
    loadColors();
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-4" />
          <div className="h-96 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Timeline Color Configuration
            </h1>
            <p className="text-muted-foreground">Configure global colors for timeline displays</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button onClick={saveAllChanges} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={resetAllColors}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">
            You have unsaved changes. Click "Save Changes" to apply them globally.
          </span>
        </div>
      )}

      {/* Worker Type Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Worker Type Colors
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These colors appear as segments within shift bars on timeline displays
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(WORKER_TYPES).map(([type, config]) => {
            const IconComponent = config.icon;
            const currentColor = getWorkerTypeColor(type);
            
            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: currentColor }}
                    >
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{config.label}</h4>
                      <p className="text-sm text-muted-foreground">{type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {currentColor.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Color:</Label>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => updateWorkerTypeColor(type, e.target.value)}
                      className="w-12 h-8 rounded border cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={currentColor}
                      onChange={(e) => updateWorkerTypeColor(type, e.target.value)}
                      className="font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateWorkerTypeColor(type, config.defaultColor)}
                  >
                    Reset
                  </Button>
                </div>

                {/* Preset colors */}
                <div>
                  <Label className="text-xs mb-2 block">Quick Colors:</Label>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                          currentColor === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateWorkerTypeColor(type, color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                
                {type !== 'general_labor' && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            How Timeline Colors Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Worker Type Colors
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Show as segments within shift bars</li>
                <li>• Filled segments = assigned workers</li>
                <li>• Semi-transparent = unassigned slots</li>
                <li>• Help identify worker type requirements</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Crew Chief Colors
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Appear as shift background tints</li>
                <li>• Show as shift border colors</li>
                <li>• Auto-assigned when crew chiefs are assigned</li>
                <li>• Help identify which crew chief manages each shift</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">Global Configuration</p>
              <p className="text-xs text-blue-700">
                Changes made here apply to all timeline displays across the entire application for all users. 
                Crew chief colors are automatically assigned when crew chiefs are assigned to shifts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}