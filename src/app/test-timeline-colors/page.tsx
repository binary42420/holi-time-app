"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTimelineColors } from '@/hooks/use-timeline-colors';
import { Crown, User, Truck, HardHat } from 'lucide-react';

const WORKER_TYPES = {
  crew_chief: { icon: Crown, label: 'Crew Chief', defaultColor: '#7c3aed' },
  fork_operator: { icon: Truck, label: 'Fork Operator', defaultColor: '#ea580c' },
  stage_hand: { icon: HardHat, label: 'Stage Hand', defaultColor: '#2563eb' },
  general_labor: { icon: User, label: 'General Labor', defaultColor: '#6b7280' }
};

export default function TestTimelineColorsPage() {
  const {
    colors,
    isLoading,
    error,
    isAdmin,
    getWorkerTypeColor,
    getCrewChiefColor,
    updateCrewChiefColor,
    updateWorkerTypeColor,
    resetColors
  } = useTimelineColors();

  const testCrewChiefs = ['John Smith', 'Jane Doe', 'Mike Johnson'];

  const handleTestUpdate = async () => {
    if (!isAdmin) return;
    
    try {
      await updateWorkerTypeColor('crew_chief', '#ff0000');
      await updateCrewChiefColor('John Smith', '#00ff00');
      console.log('Test colors updated successfully');
    } catch (error) {
      console.error('Failed to update test colors:', error);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    
    try {
      await resetColors();
      console.log('Colors reset successfully');
    } catch (error) {
      console.error('Failed to reset colors:', error);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading timeline colors...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timeline Colors Test</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button onClick={handleTestUpdate} variant="outline">
                Test Update Colors
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset Colors
              </Button>
            </>
          )}
          <div className="text-sm text-muted-foreground">
            Admin: {isAdmin ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Worker Type Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Type Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(WORKER_TYPES).map(([type, config]) => {
              const IconComponent = config.icon;
              const color = getWorkerTypeColor(type);
              
              return (
                <div key={type} className="flex items-center gap-3 p-3 border rounded">
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-sm text-muted-foreground font-mono">{color}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Crew Chief Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Chief Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {testCrewChiefs.map((name) => {
              const colorConfig = getCrewChiefColor(name);
              
              return (
                <div key={name} className="flex items-center gap-3 p-3 border rounded">
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: colorConfig.bg }}
                  >
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono">{colorConfig.bg}</span> | 
                      <span className="font-mono ml-1">{colorConfig.light}</span>
                    </div>
                  </div>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: colorConfig.light }}
                    title="Light variant"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Color Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(colors, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}