"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Palette, 
  RotateCcw, 
  Crown, 
  User, 
  Save, 
  X,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorConfig {
  bg: string;
  light: string;
  name: string;
}

interface TimelineColorLegendProps {
  crewChiefs: Array<{ name: string; color: ColorConfig }>;
  workerTypes: Record<string, { icon: any; label: string; color: string }>;
  customCrewChiefColors: Record<string, ColorConfig>;
  customWorkerTypeColors: Record<string, string>;
  isAdmin: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onUpdateCrewChiefColor: (name: string, color: string) => void;
  onUpdateWorkerTypeColor: (type: string, color: string) => void;
  onResetColors: () => void;
}

// Default color palettes for easy selection
const PRESET_COLORS = [
  '#e11d48', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#059669',
  '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#be185d', '#374151',
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280', '#ef4444', '#f59e0b', '#10b981', '#14b8a6'
];

const ColorPicker = ({ 
  currentColor, 
  onColorChange, 
  onSave, 
  onCancel,
  label 
}: {
  currentColor: string;
  onColorChange: (color: string) => void;
  onSave: () => void;
  onCancel: () => void;
  label: string;
}) => {
  const [tempColor, setTempColor] = useState(currentColor);

  return (
    <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-white border border-gray-200 rounded-lg shadow-xl min-w-80">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Customize {label}</h4>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Color Input */}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={tempColor}
              onChange={(e) => {
                setTempColor(e.target.value);
                onColorChange(e.target.value);
              }}
              className="w-16 h-10 rounded border cursor-pointer"
            />
            <div className="flex-1">
              <Label className="text-xs">Hex Color</Label>
              <Input
                value={tempColor}
                onChange={(e) => {
                  setTempColor(e.target.value);
                  onColorChange(e.target.value);
                }}
                className="h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Preset Colors */}
          <div>
            <Label className="text-xs mb-2 block">Quick Colors</Label>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                    tempColor === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setTempColor(color);
                    onColorChange(color);
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded border">
            <Label className="text-xs mb-2 block">Preview</Label>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: tempColor }}
              />
              <span className="text-sm font-medium">{label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Changes apply globally for all users
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorBadge = ({ 
  color, 
  label, 
  icon: IconComponent, 
  onClick, 
  isSelected,
  showColorPicker,
  onColorChange,
  onSave,
  onCancel,
  currentColor,
  isAdmin = false,
  description
}: {
  color: string;
  label: string;
  icon?: any;
  onClick: () => void;
  isSelected: boolean;
  showColorPicker: boolean;
  onColorChange: (color: string) => void;
  onSave: () => void;
  onCancel: () => void;
  currentColor: string;
  isAdmin?: boolean;
  description?: string;
}) => {
  return (
    <div className="relative">
      <Badge
        variant="outline"
        className={`
          ${isAdmin ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/50' : 'cursor-default'} 
          transition-all duration-200 flex items-center gap-2 py-2 px-3 select-none
          ${isSelected ? 'ring-2 ring-primary ring-offset-1 bg-primary/10 border-primary' : ''}
        `}
        onClick={isAdmin ? onClick : undefined}
        title={isAdmin ? `Click to customize ${label} color` : `${label} - Admin can customize colors`}
      >
        <div 
          className={`w-5 h-5 rounded border-2 border-white shadow-sm flex items-center justify-center 
            ${isAdmin ? 'transition-transform hover:scale-110' : ''}`}
          style={{ backgroundColor: currentColor }}
        >
          {IconComponent && <IconComponent className="h-3 w-3 text-white" />}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
        {isAdmin && (
          <Palette className={`h-3 w-3 transition-opacity ${isSelected ? 'opacity-100 text-primary' : 'opacity-40'}`} />
        )}
      </Badge>
      
      {showColorPicker && isAdmin && (
        <ColorPicker
          currentColor={currentColor}
          onColorChange={onColorChange}
          onSave={onSave}
          onCancel={onCancel}
          label={label}
        />
      )}
    </div>
  );
};

export function TimelineColorLegend({
  crewChiefs,
  workerTypes,
  customCrewChiefColors,
  customWorkerTypeColors,
  isAdmin,
  isVisible,
  onToggleVisibility,
  onUpdateCrewChiefColor,
  onUpdateWorkerTypeColor,
  onResetColors
}: TimelineColorLegendProps) {
  const { toast } = useToast();
  const [selectedColorKey, setSelectedColorKey] = useState<{ type: 'crew_chief' | 'worker_type'; key: string } | null>(null);
  const [tempColors, setTempColors] = useState<{ crewChief: Record<string, string>; workerType: Record<string, string> }>({
    crewChief: {},
    workerType: {}
  });

  // Helper function to get worker type color
  const getWorkerTypeColor = (type: string) => {
    return customWorkerTypeColors[type] || workerTypes[type]?.color || '#6b7280';
  };

  // Handle color changes
  const handleColorChange = (type: 'crew_chief' | 'worker_type', key: string, color: string) => {
    if (type === 'crew_chief') {
      setTempColors(prev => ({
        ...prev,
        crewChief: { ...prev.crewChief, [key]: color }
      }));
    } else {
      setTempColors(prev => ({
        ...prev,
        workerType: { ...prev.workerType, [key]: color }
      }));
    }
  };

  // Save color changes
  const handleSaveColor = (type: 'crew_chief' | 'worker_type', key: string) => {
    const color = type === 'crew_chief' ? tempColors.crewChief[key] : tempColors.workerType[key];
    
    if (color) {
      if (type === 'crew_chief') {
        onUpdateCrewChiefColor(key, color);
        toast({
          title: "Color Updated",
          description: `${key}'s color has been updated globally.`,
        });
      } else {
        onUpdateWorkerTypeColor(key, color);
        toast({
          title: "Color Updated", 
          description: `${workerTypes[key]?.label || key} color has been updated globally.`,
        });
      }
    }
    
    setSelectedColorKey(null);
    setTempColors({ crewChief: {}, workerType: {} });
  };

  // Cancel color changes
  const handleCancelColor = () => {
    setSelectedColorKey(null);
    setTempColors({ crewChief: {}, workerType: {} });
  };

  // Handle reset colors
  const handleResetColors = async () => {
    try {
      await onResetColors();
      toast({
        title: "Colors Reset",
        description: "All timeline colors have been reset to defaults.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset colors. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Timeline Color Configuration
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin Controls
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetColors}
                className="flex items-center gap-1"
                title="Reset all colors to defaults"
              >
                <RotateCcw className="h-3 w-3" />
                Reset All
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleVisibility}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Information Banner */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">Timeline Color System</p>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• <strong>Crew Chief colors</strong> appear as shift background tints and borders</p>
              <p>• <strong>Worker Type colors</strong> show as segments within shifts (filled = assigned, transparent = unassigned)</p>
              {isAdmin ? (
                <p>• <strong>Click any color badge</strong> to customize - changes apply globally for all users</p>
              ) : (
                <p>• <strong>Color customization</strong> is available to administrators only</p>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="crew-chiefs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crew-chiefs" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Crew Chiefs ({crewChiefs.length})
            </TabsTrigger>
            <TabsTrigger value="worker-types" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Worker Types ({Object.keys(workerTypes).length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="crew-chiefs" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Crew Chief Colors</h4>
                <span className="text-xs text-muted-foreground">Affects shift borders and backgrounds</span>
              </div>
              
              {crewChiefs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {crewChiefs.map((cc) => (
                    <ColorBadge
                      key={cc.name}
                      color={cc.color.bg}
                      currentColor={tempColors.crewChief[cc.name] || cc.color.bg}
                      label={cc.name}
                      description="Crew Chief"
                      onClick={() => setSelectedColorKey(
                        selectedColorKey?.type === 'crew_chief' && selectedColorKey?.key === cc.name 
                          ? null 
                          : { type: 'crew_chief', key: cc.name }
                      )}
                      isSelected={selectedColorKey?.type === 'crew_chief' && selectedColorKey?.key === cc.name}
                      showColorPicker={selectedColorKey?.type === 'crew_chief' && selectedColorKey?.key === cc.name}
                      onColorChange={(color) => handleColorChange('crew_chief', cc.name, color)}
                      onSave={() => handleSaveColor('crew_chief', cc.name)}
                      onCancel={handleCancelColor}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No crew chiefs assigned to shifts yet</p>
                  <p className="text-xs">Colors will appear when crew chiefs are assigned</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="worker-types" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Worker Type Colors</h4>
                <span className="text-xs text-muted-foreground">Affects segments within shifts</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(workerTypes).map(([type, config]) => (
                  <ColorBadge
                    key={type}
                    color={getWorkerTypeColor(type)}
                    currentColor={tempColors.workerType[type] || getWorkerTypeColor(type)}
                    label={config.label}
                    icon={config.icon}
                    description={`${type.replace('_', ' ')}`}
                    onClick={() => setSelectedColorKey(
                      selectedColorKey?.type === 'worker_type' && selectedColorKey?.key === type 
                        ? null 
                        : { type: 'worker_type', key: type }
                    )}
                    isSelected={selectedColorKey?.type === 'worker_type' && selectedColorKey?.key === type}
                    showColorPicker={selectedColorKey?.type === 'worker_type' && selectedColorKey?.key === type}
                    onColorChange={(color) => handleColorChange('worker_type', type, color)}
                    onSave={() => handleSaveColor('worker_type', type)}
                    onCancel={handleCancelColor}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Admin Actions */}
        {isAdmin && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Administrator Actions</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetColors}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset All Colors
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}