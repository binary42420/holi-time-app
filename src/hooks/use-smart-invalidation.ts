"use client";

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { createSmartCacheKey } from './use-optimized-queries';

// Define relationships between different data types
const DATA_RELATIONSHIPS = {
  shifts: {
    affects: ['timesheets', 'assignments', 'notifications'],
    affectedBy: ['jobs', 'users', 'companies'],
    patterns: [/^shifts/, /^shift-/, /^shift-assignments/],
  },
  jobs: {
    affects: ['shifts', 'assignments'],
    affectedBy: ['companies'],
    patterns: [/^jobs/, /^job-/],
  },
  users: {
    affects: ['shifts', 'assignments', 'timesheets'],
    affectedBy: [],
    patterns: [/^users/, /^user-/],
  },
  companies: {
    affects: ['jobs', 'shifts', 'users'],
    affectedBy: [],
    patterns: [/^companies/, /^company-/],
  },
  timesheets: {
    affects: ['notifications'],
    affectedBy: ['shifts', 'users'],
    patterns: [/^timesheets/, /^timesheet-/],
  },
  assignments: {
    affects: ['shifts', 'timesheets'],
    affectedBy: ['users', 'shifts'],
    patterns: [/^assignments/, /^assignment-/, /^shift-assignments/],
  },
  notifications: {
    affects: [],
    affectedBy: ['shifts', 'timesheets', 'users'],
    patterns: [/^notifications/, /^notification-/],
  },
};

// Invalidation strategies
type InvalidationStrategy = 'immediate' | 'batched' | 'background' | 'selective';

interface InvalidationOptions {
  strategy?: InvalidationStrategy;
  delay?: number;
  cascade?: boolean;
  selective?: string[];
}

export const useSmartInvalidation = () => {
  const queryClient = useQueryClient();
  const batchedInvalidationsRef = useRef<Set<string>>(new Set());
  const invalidationTimeoutRef = useRef<NodeJS.Timeout>();

  // Get all queries that match a pattern
  const getQueriesByPattern = useCallback((patterns: RegExp[]) => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();
    
    return allQueries.filter(query => {
      const queryKeyString = JSON.stringify(query.queryKey);
      return patterns.some(pattern => pattern.test(queryKeyString));
    });
  }, [queryClient]);

  // Immediate invalidation
  const invalidateImmediate = useCallback(async (dataType: string, options?: InvalidationOptions) => {
    const relationship = DATA_RELATIONSHIPS[dataType as keyof typeof DATA_RELATIONSHIPS];
    if (!relationship) return;

    // Invalidate direct patterns
    for (const pattern of relationship.patterns) {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKeyString = JSON.stringify(query.queryKey);
          return pattern.test(queryKeyString);
        },
      });
    }

    // Cascade invalidation if enabled
    if (options?.cascade !== false) {
      for (const affectedType of relationship.affects) {
        const affectedRelationship = DATA_RELATIONSHIPS[affectedType as keyof typeof DATA_RELATIONSHIPS];
        if (affectedRelationship) {
          for (const pattern of affectedRelationship.patterns) {
            await queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKeyString = JSON.stringify(query.queryKey);
                return pattern.test(queryKeyString);
              },
            });
          }
        }
      }
    }
  }, [queryClient]);

  // Batched invalidation
  const invalidateBatched = useCallback((dataType: string, options?: InvalidationOptions) => {
    batchedInvalidationsRef.current.add(dataType);

    // Clear existing timeout
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }

    // Set new timeout
    invalidationTimeoutRef.current = setTimeout(async () => {
      const typesToInvalidate = Array.from(batchedInvalidationsRef.current);
      batchedInvalidationsRef.current.clear();

      // Process all batched invalidations
      for (const type of typesToInvalidate) {
        await invalidateImmediate(type, { cascade: options?.cascade });
      }
    }, options?.delay || 1000);
  }, [invalidateImmediate]);

  // Background invalidation
  const invalidateBackground = useCallback((dataType: string, options?: InvalidationOptions) => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleInvalidation = () => {
      invalidateImmediate(dataType, options);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(scheduleInvalidation);
    } else {
      setTimeout(scheduleInvalidation, 0);
    }
  }, [invalidateImmediate]);

  // Selective invalidation
  const invalidateSelective = useCallback(async (dataType: string, options?: InvalidationOptions) => {
    const relationship = DATA_RELATIONSHIPS[dataType as keyof typeof DATA_RELATIONSHIPS];
    if (!relationship) return;

    const selectivePatterns = options?.selective || [];
    
    // Only invalidate queries that match selective criteria
    for (const pattern of relationship.patterns) {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKeyString = JSON.stringify(query.queryKey);
          const matchesPattern = pattern.test(queryKeyString);
          
          if (!matchesPattern) return false;
          
          // Check if query matches selective criteria
          return selectivePatterns.length === 0 || 
                 selectivePatterns.some(criteria => queryKeyString.includes(criteria));
        },
      });
    }
  }, [queryClient]);

  // Main invalidation function
  const invalidate = useCallback(async (
    dataType: string, 
    options: InvalidationOptions = {}
  ) => {
    const strategy = options.strategy || 'immediate';

    switch (strategy) {
      case 'immediate':
        await invalidateImmediate(dataType, options);
        break;
      case 'batched':
        invalidateBatched(dataType, options);
        break;
      case 'background':
        invalidateBackground(dataType, options);
        break;
      case 'selective':
        await invalidateSelective(dataType, options);
        break;
    }
  }, [invalidateImmediate, invalidateBatched, invalidateBackground, invalidateSelective]);

  // Specific invalidation functions for common operations
  const invalidateShiftData = useCallback(async (shiftId?: string, strategy: InvalidationStrategy = 'immediate') => {
    if (shiftId) {
      // Selective invalidation for specific shift
      await invalidate('shifts', {
        strategy: 'selective',
        selective: [shiftId],
        cascade: true,
      });
    } else {
      // Invalidate all shift data
      await invalidate('shifts', { strategy, cascade: true });
    }
  }, [invalidate]);

  const invalidateUserData = useCallback(async (userId?: string, strategy: InvalidationStrategy = 'immediate') => {
    if (userId) {
      await invalidate('users', {
        strategy: 'selective',
        selective: [userId],
        cascade: true,
      });
    } else {
      await invalidate('users', { strategy, cascade: true });
    }
  }, [invalidate]);

  const invalidateJobData = useCallback(async (jobId?: string, strategy: InvalidationStrategy = 'immediate') => {
    if (jobId) {
      await invalidate('jobs', {
        strategy: 'selective',
        selective: [jobId],
        cascade: true,
      });
    } else {
      await invalidate('jobs', { strategy, cascade: true });
    }
  }, [invalidate]);

  const invalidateTimesheetData = useCallback(async (timesheetId?: string, strategy: InvalidationStrategy = 'immediate') => {
    if (timesheetId) {
      await invalidate('timesheets', {
        strategy: 'selective',
        selective: [timesheetId],
        cascade: true,
      });
    } else {
      await invalidate('timesheets', { strategy, cascade: true });
    }
  }, [invalidate]);

  const invalidateCompanyData = useCallback(async (companyId?: string, strategy: InvalidationStrategy = 'immediate') => {
    if (companyId) {
      await invalidate('companies', {
        strategy: 'selective',
        selective: [companyId],
        cascade: true,
      });
    } else {
      await invalidate('companies', { strategy, cascade: true });
    }
  }, [invalidate]);

  // Bulk invalidation for multiple data types
  const invalidateBulk = useCallback(async (
    dataTypes: string[], 
    strategy: InvalidationStrategy = 'batched'
  ) => {
    if (strategy === 'batched') {
      // Add all types to batch
      dataTypes.forEach(type => {
        batchedInvalidationsRef.current.add(type);
      });
      
      // Trigger batch processing
      invalidateBatched(dataTypes[0]);
    } else {
      // Process immediately
      for (const dataType of dataTypes) {
        await invalidate(dataType, { strategy: 'immediate' });
      }
    }
  }, [invalidate, invalidateBatched]);

  // Smart invalidation based on mutation type
  const invalidateAfterMutation = useCallback(async (
    mutationType: 'create' | 'update' | 'delete',
    dataType: string,
    entityId?: string
  ) => {
    const strategy: InvalidationStrategy = mutationType === 'delete' ? 'immediate' : 'batched';
    
    switch (mutationType) {
      case 'create':
        // New entities affect list queries
        await invalidate(dataType, { strategy, cascade: false });
        break;
      case 'update':
        // Updates affect both individual and list queries
        if (entityId) {
          await invalidate(dataType, {
            strategy: 'selective',
            selective: [entityId],
            cascade: true,
          });
        } else {
          await invalidate(dataType, { strategy, cascade: true });
        }
        break;
      case 'delete':
        // Deletions require immediate invalidation
        await invalidate(dataType, { strategy: 'immediate', cascade: true });
        break;
    }
  }, [invalidate]);

  // Get invalidation statistics
  const getInvalidationStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();
    
    const stats = {
      totalQueries: allQueries.length,
      staleQueries: allQueries.filter(q => q.isStale()).length,
      pendingInvalidations: batchedInvalidationsRef.current.size,
      queryBreakdown: {} as Record<string, number>,
    };

    // Count queries by type
    Object.keys(DATA_RELATIONSHIPS).forEach(dataType => {
      const relationship = DATA_RELATIONSHIPS[dataType as keyof typeof DATA_RELATIONSHIPS];
      const matchingQueries = getQueriesByPattern(relationship.patterns);
      stats.queryBreakdown[dataType] = matchingQueries.length;
    });

    return stats;
  }, [queryClient, getQueriesByPattern]);

  return {
    // Main invalidation function
    invalidate,
    
    // Specific invalidation functions
    invalidateShiftData,
    invalidateUserData,
    invalidateJobData,
    invalidateTimesheetData,
    invalidateCompanyData,
    
    // Bulk operations
    invalidateBulk,
    invalidateAfterMutation,
    
    // Utilities
    getInvalidationStats,
    getQueriesByPattern,
  };
};