"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface ColorConfig {
  bg: string;
  light: string;
  name: string;
}

interface TimelineColors {
  crewChiefColors: Record<string, ColorConfig>;
  workerTypeColors: Record<string, string>;
}

// Default colors
const DEFAULT_WORKER_TYPE_COLORS = {
  crew_chief: '#7c3aed',
  fork_operator: '#ea580c', 
  stage_hand: '#2563eb',
  general_labor: '#6b7280'
};

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

export function useTimelineColors() {
  const { data: session } = useSession();
  const [colors, setColors] = useState<TimelineColors>({
    crewChiefColors: {},
    workerTypeColors: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';

  // Load colors from API
  const loadColors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/timeline-colors');
      if (response.ok) {
        const data = await response.json();
        setColors({
          crewChiefColors: data.crewChiefColors || {},
          workerTypeColors: data.workerTypeColors || {}
        });
      } else {
        throw new Error('Failed to load colors');
      }
    } catch (err) {
      console.error('Error loading timeline colors:', err);
      setError('Failed to load timeline colors');
      // Use defaults on error
      setColors({
        crewChiefColors: {},
        workerTypeColors: {}
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save colors to API
  const saveColors = useCallback(async (type: 'crew_chief' | 'worker_type', colorData: any) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    try {
      const response = await fetch('/api/timeline-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, colors: colorData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save colors');
      }

      // Update local state
      if (type === 'crew_chief') {
        setColors(prev => ({
          ...prev,
          crewChiefColors: colorData
        }));
      } else {
        setColors(prev => ({
          ...prev,
          workerTypeColors: colorData
        }));
      }

      return true;
    } catch (err) {
      console.error('Error saving colors:', err);
      throw err;
    }
  }, [isAdmin]);

  // Reset colors to defaults
  const resetColors = useCallback(async () => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    try {
      const response = await fetch('/api/timeline-colors', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to reset colors');
      }

      // Reset local state
      setColors({
        crewChiefColors: {},
        workerTypeColors: {}
      });

      return true;
    } catch (err) {
      console.error('Error resetting colors:', err);
      throw err;
    }
  }, [isAdmin]);

  // Get worker type color with fallback to default
  const getWorkerTypeColor = useCallback((type: string) => {
    return colors.workerTypeColors[type] || DEFAULT_WORKER_TYPE_COLORS[type as keyof typeof DEFAULT_WORKER_TYPE_COLORS] || '#6b7280';
  }, [colors.workerTypeColors]);

  // Get crew chief color with auto-assignment for new crew chiefs
  const getCrewChiefColor = useCallback((crewChiefName: string) => {
    // If we have a custom color for this crew chief, use it
    if (colors.crewChiefColors[crewChiefName]) {
      return colors.crewChiefColors[crewChiefName];
    }

    // Auto-assign a color from defaults based on name hash
    const hash = crewChiefName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colorIndex = Math.abs(hash) % DEFAULT_CREW_CHIEF_COLORS.length;
    return DEFAULT_CREW_CHIEF_COLORS[colorIndex];
  }, [colors.crewChiefColors]);

  // Update crew chief color
  const updateCrewChiefColor = useCallback(async (crewChiefName: string, color: string) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const lightColor = generateLightColor(color);
    const newCrewChiefColors = {
      ...colors.crewChiefColors,
      [crewChiefName]: {
        bg: color,
        light: lightColor,
        name: crewChiefName
      }
    };

    await saveColors('crew_chief', newCrewChiefColors);
  }, [colors.crewChiefColors, isAdmin, saveColors]);

  // Update worker type color
  const updateWorkerTypeColor = useCallback(async (workerType: string, color: string) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const newWorkerTypeColors = {
      ...colors.workerTypeColors,
      [workerType]: color
    };

    await saveColors('worker_type', newWorkerTypeColors);
  }, [colors.workerTypeColors, isAdmin, saveColors]);

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

  // Load colors on mount
  useEffect(() => {
    loadColors();
  }, [loadColors]);

  return {
    colors,
    isLoading,
    error,
    isAdmin,
    loadColors,
    saveColors,
    resetColors,
    getWorkerTypeColor,
    getCrewChiefColor,
    updateCrewChiefColor,
    updateWorkerTypeColor
  };
}