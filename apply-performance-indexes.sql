-- Performance Optimization Indexes for Jobs-Shifts Migration
-- Apply these indexes to improve query performance

-- Enhanced Job Model Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_createdAt_idx" ON "jobs" ("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_updatedAt_idx" ON "jobs" ("updatedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_name_idx" ON "jobs" ("name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_companyId_name_idx" ON "jobs" ("companyId", "name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_status_createdAt_idx" ON "jobs" ("status", "createdAt");

-- Enhanced Shift Model Indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_startTime_idx" ON "shifts" ("startTime");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_endTime_idx" ON "shifts" ("endTime");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_date_startTime_idx" ON "shifts" ("date", "startTime");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_date_endTime_idx" ON "shifts" ("date", "endTime");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_jobId_date_status_idx" ON "shifts" ("jobId", "date", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_createdAt_idx" ON "shifts" ("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_updatedAt_idx" ON "shifts" ("updatedAt");

-- Additional composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "jobs_company_status_created_idx" ON "jobs" ("companyId", "status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "shifts_status_date_time_idx" ON "shifts" ("status", "date", "startTime");

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('jobs', 'shifts')
AND indexname LIKE '%_idx'
ORDER BY tablename, indexname;