"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useUser } from './use-user';
import { apiService } from '@/lib/services/api';
import { createSmartCacheKey, QUERY_CONFIG } from '@/lib/query-config';
import { Company, Job, ShiftWithDetails, TimesheetDetails, UserWithAssignments } from '@/lib/types';

export type EntityType = 'company' | 'job' | 'shift' | 'timesheet' | 'user' | 'employee';

// Type mapping for entity types
type EntityTypeMap = {
  company: Company;
  job: Job;
  shift: ShiftWithDetails;
  timesheet: TimesheetDetails;
  user: UserWithAssignments;
  employee: UserWithAssignments;
};

interface EntityCacheOptions {
  prefetchRelated?: boolean;
  enableRealTimeUpdates?: boolean;
  customStaleTime?: number;
  maxRelatedPrefetch?: number;
}

/**
 * Enhanced caching hook for individual entities with intelligent
 * prefetching of related data and real-time updates
 */
export const useEntityCache = <T extends EntityType>(
  entityType: T,
  entityId: string,
  options: EntityCacheOptions = {}
) => {
  const {
    prefetchRelated = true,
    enableRealTimeUpdates = false,
    customStaleTime,
    maxRelatedPrefetch = 5
  } = options;

  const { user } = useUser();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Get appropriate stale time based on entity type
  const getStaleTime = useCallback(() => {
    if (customStaleTime) return customStaleTime;
    
    switch (entityType) {
      case 'timesheet':
        return QUERY_CONFIG.STALE_TIMES.REAL_TIME;
      case 'shift':
        return QUERY_CONFIG.STALE_TIMES.DYNAMIC;
      case 'job':
        return QUERY_CONFIG.STALE_TIMES.SEMI_STATIC;
      case 'company':
      case 'user':
      case 'employee':
        return QUERY_CONFIG.STALE_TIMES.STATIC;
      default:
        return QUERY_CONFIG.STALE_TIMES.SEMI_STATIC;
    }
  }, [entityType, customStaleTime]);

  // Get appropriate query function
  const getQueryFunction = useCallback((): (() => Promise<EntityTypeMap[T]>) => {
    switch (entityType) {
      case 'company':
        return () => apiService.getCompany(entityId) as Promise<EntityTypeMap[T]>;
      case 'job':
        return () => apiService.getJob(entityId) as Promise<EntityTypeMap[T]>;
      case 'shift':
        return () => apiService.getShift(entityId) as Promise<EntityTypeMap[T]>;
      case 'timesheet':
        return () => apiService.getTimesheet(entityId) as Promise<EntityTypeMap[T]>;
      case 'user':
      case 'employee':
        return () => apiService.getUserById(entityId) as Promise<EntityTypeMap[T]>;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }, [entityType, entityId]);

  // Main entity query
  const entityQuery = useQuery({
    queryKey: [entityType, entityId],
    queryFn: getQueryFunction(),
    enabled: !!entityId && !!user,
    staleTime: getStaleTime(),
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: enableRealTimeUpdates,
    refetchOnMount: false,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    networkMode: 'offlineFirst',
    placeholderData: (previousData) => previousData,
  });

  // Prefetch related entities
  const prefetchRelatedEntities = useCallback(async () => {
    if (!prefetchRelated || !entityQuery.data || !entityId) return;

    const entity = entityQuery.data as unknown as EntityTypeMap[T];
    const prefetchPromises: Promise<any>[] = [];

    try {
      switch (entityType) {
        case 'company':
          // Prefetch company jobs and shifts
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: createSmartCacheKey('jobs', { companyId: entityId }),
              queryFn: () => apiService.getJobs({ companyId: entityId }),
              staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
            })
          );
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: createSmartCacheKey('shifts', { companyId: entityId }),
              queryFn: () => apiService.getShifts({ companyId: entityId }),
              staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
            })
          );
          break;

        case 'job':
          // Prefetch job shifts and company
          const jobEntity = entity as Job;
          if (jobEntity.companyId) {
            prefetchPromises.push(
              queryClient.prefetchQuery({
                queryKey: ['company', jobEntity.companyId],
                queryFn: () => apiService.getCompany(jobEntity.companyId),
                staleTime: QUERY_CONFIG.STALE_TIMES.STATIC,
              })
            );
          }
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: createSmartCacheKey('shifts', { jobId: entityId }),
              queryFn: () => apiService.getShifts({ jobId: entityId }),
              staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
            })
          );
          break;

        case 'shift':
          // Prefetch shift assignments, job, and company
          const shiftEntity = entity as ShiftWithDetails;
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['shift-assignments', entityId],
              queryFn: () => apiService.getShiftAssignments(entityId),
              staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
            })
          );
          if (shiftEntity.jobId) {
            prefetchPromises.push(
              queryClient.prefetchQuery({
                queryKey: ['job', shiftEntity.jobId],
                queryFn: () => apiService.getJob(shiftEntity.jobId),
                staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
              })
            );
            if (shiftEntity.job?.company?.id) {
              prefetchPromises.push(
                queryClient.prefetchQuery({
                  queryKey: ['company', shiftEntity.job.company.id],
                  queryFn: () => apiService.getCompany(shiftEntity.job.company.id),
                  staleTime: QUERY_CONFIG.STALE_TIMES.STATIC,
                })
              );
            }
          }
          break;

        case 'timesheet':
          // Prefetch related shift and its details
          const timesheetEntity = entity as TimesheetDetails;
          if (timesheetEntity.shiftId) {
            prefetchPromises.push(
              queryClient.prefetchQuery({
                queryKey: ['shift', timesheetEntity.shiftId],
                queryFn: () => apiService.getShift(timesheetEntity.shiftId),
                staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
              })
            );
          }
          break;

        case 'user':
        case 'employee':
          // Prefetch user's recent assignments and shifts
          const userEntity = entity as UserWithAssignments;
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: createSmartCacheKey('shifts', { userId: entityId }),
              queryFn: () => apiService.getShifts({ search: userEntity.name }),
              staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
            })
          );
          break;
      }

      // Execute prefetch promises with concurrency limit
      const batches = [];
      for (let i = 0; i < prefetchPromises.length; i += maxRelatedPrefetch) {
        batches.push(prefetchPromises.slice(i, i + maxRelatedPrefetch));
      }

      for (const batch of batches) {
        await Promise.allSettled(batch);
      }

      prefetchedRef.current.add(entityId);
    } catch (error) {
      console.warn(`[EntityCache] Failed to prefetch related data for ${entityType}:${entityId}`, error);
    }
  }, [
    prefetchRelated,
    entityQuery.data,
    entityId,
    entityType,
    queryClient,
    maxRelatedPrefetch
  ]);

  // Real-time updates
  const enableRealTimeSync = useCallback(() => {
    if (!enableRealTimeUpdates || !entityId) return;

    updateIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
    }, getStaleTime());
  }, [enableRealTimeUpdates, entityId, entityType, queryClient, getStaleTime]);

  // Invalidate related caches
  const invalidateRelatedCaches = useCallback(() => {
    const queries = [];
    
    switch (entityType) {
      case 'company':
        queries.push(
          { queryKey: createSmartCacheKey('jobs', { companyId: entityId }) },
          { queryKey: createSmartCacheKey('shifts', { companyId: entityId }) }
        );
        break;
      case 'job':
        queries.push(
          { queryKey: createSmartCacheKey('shifts', { jobId: entityId }) }
        );
        break;
      case 'shift':
        queries.push(
          { queryKey: ['shift-assignments', entityId] }
        );
        break;
    }

    queries.forEach(query => {
      queryClient.invalidateQueries(query);
    });
  }, [entityType, entityId, queryClient]);

  // Optimistic update for entity
  const updateEntityOptimistically = useCallback((updater: (oldData: any) => any) => {
    queryClient.setQueryData([entityType, entityId], updater);
    
    // Invalidate related queries after optimistic update
    setTimeout(() => {
      invalidateRelatedCaches();
    }, 100);
  }, [entityType, entityId, queryClient, invalidateRelatedCaches]);

  // Prefetch related data when entity loads
  useEffect(() => {
    if (entityQuery.data && !entityQuery.isLoading && !prefetchedRef.current.has(entityId)) {
      // Delay prefetching to not block main query
      setTimeout(() => {
        prefetchRelatedEntities();
      }, 100);
    }
  }, [entityQuery.data, entityQuery.isLoading, entityId, prefetchRelatedEntities]);

  // Setup real-time updates
  useEffect(() => {
    enableRealTimeSync();
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enableRealTimeSync]);

  return {
    // Main query result
    ...entityQuery,
    data: entityQuery.data as unknown as EntityTypeMap[T] | undefined,
    
    // Additional utilities
    prefetchRelatedEntities,
    invalidateRelatedCaches,
    updateEntityOptimistically,
    
    // State
    hasPrefetchedRelated: prefetchedRef.current.has(entityId),
    isRealTimeEnabled: enableRealTimeUpdates,
  };
};

// Specialized hooks for each entity type
export const useCompanyCache = (companyId: string, options?: EntityCacheOptions) =>
  useEntityCache('company', companyId, options);

export const useJobCache = (jobId: string, options?: EntityCacheOptions) =>
  useEntityCache('job', jobId, options);

export const useShiftCache = (shiftId: string, options?: EntityCacheOptions) =>
  useEntityCache('shift', shiftId, { enableRealTimeUpdates: true, ...options });

export const useTimesheetCache = (timesheetId: string, options?: EntityCacheOptions) =>
  useEntityCache('timesheet', timesheetId, { enableRealTimeUpdates: true, ...options });

export const useEmployeeCache = (employeeId: string, options?: EntityCacheOptions) =>
  useEntityCache('employee', employeeId, options);

export default useEntityCache;