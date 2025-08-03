import { query } from './db'
import type { RoleCode } from './types'

export interface TimeConflict {
  id: string
  shiftId: string
  employeeId: string
  employeeName: string
  clientName: string
  jobName: string
  date: string
  startTime: string
  endTime: string
  conflictType: 'overlap' | 'back_to_back' | 'travel_time' | 'rest_period'
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface SkillConflict {
  employeeId: string
  employeeName: string
  requiredRole: RoleCode
  hasRequiredSkills: boolean
  missingSkills: string[]
  reason: string
}

export interface ConflictDetectionResult {
  hasConflicts: boolean
  timeConflicts: TimeConflict[]
  skillConflicts: SkillConflict[]
  suggestions: ConflictSuggestion[]
}

export interface ConflictSuggestion {
  type: 'alternative_employee' | 'time_adjustment' | 'skill_training' | 'role_change'
  description: string
  employeeId?: string
  employeeName?: string
  newStartTime?: string
  newEndTime?: string
  alternativeRole?: RoleCode
  priority: 'low' | 'medium' | 'high'
}

// Check for time conflicts when assigning an employee to a shift
export async function checkTimeConflicts(
  employeeId: string,
  shiftId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<TimeConflict[]> {
  try {
    const conflicts: TimeConflict[] = []

    // Check for overlapping shifts
    const overlapQuery = `
      SELECT 
        s.id as shift_id,
        s.date,
        s.start_time,
        s.end_time,
        j.name as job_name,
        COALESCE(c.company_name, c.name) as client_name,
        u.name as employee_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id
      JOIN assigned_personnel ap ON s.id = ap.shift_id
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.employee_id = $1 
        AND s.id != $2
        AND s.date = $3
        AND (
          (s.start_time <= $4 AND s.end_time > $4) OR
          (s.start_time < $5 AND s.end_time >= $5) OR
          (s.start_time >= $4 AND s.end_time <= $5)
        )
        AND s.status != 'Cancelled'
    `

    const overlapResult = await query(overlapQuery, [employeeId, shiftId, date, startTime, endTime])

    for (const row of overlapResult.rows) {
      conflicts.push({
        id: `overlap_${row.shift_id}`,
        shiftId: row.shift_id,
        employeeId,
        employeeName: row.employee_name,
        clientName: row.client_name,
        jobName: row.job_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        conflictType: 'overlap',
        severity: 'high',
        description: `Employee is already assigned to another shift during this time period`
      })
    }

    // Check for back-to-back shifts (less than 1 hour between shifts)
    const backToBackQuery = `
      SELECT 
        s.id as shift_id,
        s.date,
        s.start_time,
        s.end_time,
        j.name as job_name,
        COALESCE(c.company_name, c.name) as client_name,
        u.name as employee_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id
      JOIN assigned_personnel ap ON s.id = ap.shift_id
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.employee_id = $1 
        AND s.id != $2
        AND s.date = $3
        AND (
          (s.end_time <= $4 AND s.end_time > ($4::time - interval '1 hour')) OR
          (s.start_time >= $5 AND s.start_time < ($5::time + interval '1 hour'))
        )
        AND s.status != 'Cancelled'
    `

    const backToBackResult = await query(backToBackQuery, [employeeId, shiftId, date, startTime, endTime])

    for (const row of backToBackResult.rows) {
      conflicts.push({
        id: `back_to_back_${row.shift_id}`,
        shiftId: row.shift_id,
        employeeId,
        employeeName: row.employee_name,
        clientName: row.client_name,
        jobName: row.job_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        conflictType: 'back_to_back',
        severity: 'medium',
        description: `Employee has another shift within 1 hour of this shift`
      })
    }

    // Check for insufficient rest period (less than 8 hours between shifts on consecutive days)
    const restPeriodQuery = `
      SELECT 
        s.id as shift_id,
        s.date,
        s.start_time,
        s.end_time,
        j.name as job_name,
        COALESCE(c.company_name, c.name) as client_name,
        u.name as employee_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id
      JOIN assigned_personnel ap ON s.id = ap.shift_id
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.employee_id = $1 
        AND s.id != $2
        AND (
          (s.date = $3::date - interval '1 day' AND s.end_time > ($4::time - interval '8 hours')) OR
          (s.date = $3::date + interval '1 day' AND s.start_time < ($5::time + interval '8 hours'))
        )
        AND s.status != 'Cancelled'
    `

    const restPeriodResult = await query(restPeriodQuery, [employeeId, shiftId, date, startTime, endTime])

    for (const row of restPeriodResult.rows) {
      conflicts.push({
        id: `rest_period_${row.shift_id}`,
        shiftId: row.shift_id,
        employeeId,
        employeeName: row.employee_name,
        clientName: row.client_name,
        jobName: row.job_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        conflictType: 'rest_period',
        severity: 'low',
        description: `Employee may not have sufficient rest period (8 hours) between shifts`
      })
    }

    return conflicts
  } catch (error) {
    console.error('Error checking time conflicts:', error)
    return []
  }
}

// Check for skill/role conflicts
export async function checkSkillConflicts(
  employeeId: string,
  roleCode: RoleCode
): Promise<SkillConflict[]> {
  try {
    const conflicts: SkillConflict[] = []

    // Get employee details
    const employeeResult = await query(`
      SELECT 
        id,
        name,
        crew_chief_eligible,
        fork_operator_eligible,
        role
      FROM users 
      WHERE id = $1
    `, [employeeId])

    if (employeeResult.rows.length === 0) {
      return conflicts
    }

    const employee = employeeResult.rows[0]
    const missingSkills: string[] = []
    let hasRequiredSkills = true

    // Check role-specific requirements
    switch (roleCode) {
      case 'CC': // Crew Chief
        if (!employee.crew_chief_eligible && employee.role !== 'Crew Chief' && employee.role !== 'Admin') {
          hasRequiredSkills = false
          missingSkills.push('Crew Chief Certification')
        }
        break

      case 'FO': // Fork Operator
      case 'RFO': // Reach Fork Operator
        if (!employee.fork_operator_eligible && employee.role !== 'Admin') {
          hasRequiredSkills = false
          missingSkills.push('Fork Operator Certification')
        }
        break

      case 'SH': // Stage Hand
      case 'RG': // Rigger
      case 'GL': // General Labor
        // These roles don't have specific skill requirements
        break

      default:
        break
    }

    if (!hasRequiredSkills) {
      conflicts.push({
        employeeId,
        employeeName: employee.name,
        requiredRole: roleCode,
        hasRequiredSkills,
        missingSkills,
        reason: `Employee lacks required certifications for ${roleCode} role`
      })
    }

    return conflicts
  } catch (error) {
    console.error('Error checking skill conflicts:', error)
    return []
  }
}

// Generate suggestions to resolve conflicts
export async function generateConflictSuggestions(
  timeConflicts: TimeConflict[],
  skillConflicts: SkillConflict[],
  shiftId: string,
  roleCode: RoleCode,
  date: string,
  startTime: string,
  endTime: string
): Promise<ConflictSuggestion[]> {
  try {
    const suggestions: ConflictSuggestion[] = []

    // Suggest alternative employees for skill conflicts
    if (skillConflicts.length > 0) {
      const alternativeEmployeesQuery = `
        SELECT 
          u.id,
          u.name,
          u.crew_chief_eligible,
          u.fork_operator_eligible,
          u.role
        FROM users u
        WHERE u.role IN ('Employee', 'Crew Chief', 'Admin')
          AND u.id NOT IN (
            SELECT ap.employee_id 
            FROM assigned_personnel ap
            JOIN shifts s ON ap.shift_id = s.id
            WHERE s.date = $1
              AND s.status != 'Cancelled'
              AND (
                (s.start_time <= $2 AND s.end_time > $2) OR
                (s.start_time < $3 AND s.end_time >= $3) OR
                (s.start_time >= $2 AND s.end_time <= $3)
              )
          )
          AND (
            ($4 = 'CC' AND (u.crew_chief_eligible = true OR u.role IN ('Crew Chief', 'Admin'))) OR
            ($4 IN ('FO', 'RFO') AND (u.fork_operator_eligible = true OR u.role = 'Admin')) OR
            ($4 IN ('SH', 'RG', 'GL'))
          )
        ORDER BY 
          CASE 
            WHEN u.role = 'Admin' THEN 1
            WHEN u.role = 'Crew Chief' THEN 2
            ELSE 3
          END,
          u.name
        LIMIT 5
      `

      const alternativeResult = await query(alternativeEmployeesQuery, [date, startTime, endTime, roleCode])

      for (const employee of alternativeResult.rows) {
        suggestions.push({
          type: 'alternative_employee',
          description: `Assign ${employee.name} instead - they have the required skills for ${roleCode}`,
          employeeId: employee.id,
          employeeName: employee.name,
          priority: 'high'
        })
      }
    }

    // Suggest time adjustments for time conflicts
    if (timeConflicts.length > 0) {
      const highSeverityConflicts = timeConflicts.filter(c => c.severity === 'high')
      
      if (highSeverityConflicts.length > 0) {
        // Suggest moving shift time
        suggestions.push({
          type: 'time_adjustment',
          description: 'Consider adjusting shift start/end times to avoid conflicts',
          priority: 'high'
        })
      }

      const mediumSeverityConflicts = timeConflicts.filter(c => c.severity === 'medium')
      
      if (mediumSeverityConflicts.length > 0) {
        suggestions.push({
          type: 'time_adjustment',
          description: 'Add buffer time between shifts to reduce fatigue',
          priority: 'medium'
        })
      }
    }

    // Suggest role changes for skill conflicts
    for (const skillConflict of skillConflicts) {
      if (roleCode === 'CC') {
        suggestions.push({
          type: 'role_change',
          description: `Assign ${skillConflict.employeeName} to a different role (SH, GL) that doesn't require crew chief certification`,
          employeeId: skillConflict.employeeId,
          employeeName: skillConflict.employeeName,
          alternativeRole: 'SH',
          priority: 'medium'
        })
      } else if (roleCode === 'FO' || roleCode === 'RFO') {
        suggestions.push({
          type: 'role_change',
          description: `Assign ${skillConflict.employeeName} to a different role (SH, RG, GL) that doesn't require fork operator certification`,
          employeeId: skillConflict.employeeId,
          employeeName: skillConflict.employeeName,
          alternativeRole: 'SH',
          priority: 'medium'
        })
      }
    }

    return suggestions
  } catch (error) {
    console.error('Error generating conflict suggestions:', error)
    return []
  }
}

// Main function to detect all conflicts
export async function detectConflicts(
  employeeId: string,
  shiftId: string,
  roleCode: RoleCode,
  date: string,
  startTime: string,
  endTime: string
): Promise<ConflictDetectionResult> {
  try {
    const [timeConflicts, skillConflicts] = await Promise.all([
      checkTimeConflicts(employeeId, shiftId, date, startTime, endTime),
      checkSkillConflicts(employeeId, roleCode)
    ])

    const suggestions = await generateConflictSuggestions(
      timeConflicts,
      skillConflicts,
      shiftId,
      roleCode,
      date,
      startTime,
      endTime
    )

    return {
      hasConflicts: timeConflicts.length > 0 || skillConflicts.length > 0,
      timeConflicts,
      skillConflicts,
      suggestions
    }
  } catch (error) {
    console.error('Error detecting conflicts:', error)
    return {
      hasConflicts: false,
      timeConflicts: [],
      skillConflicts: [],
      suggestions: []
    }
  }
}

// Batch conflict detection for multiple employees
export async function batchDetectConflicts(
  assignments: Array<{
    employeeId: string
    roleCode: RoleCode
  }>,
  shiftId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Record<string, ConflictDetectionResult>> {
  try {
    const results: Record<string, ConflictDetectionResult> = {}

    // Process assignments in parallel
    const conflictPromises = assignments.map(async (assignment) => {
      const result = await detectConflicts(
        assignment.employeeId,
        shiftId,
        assignment.roleCode,
        date,
        startTime,
        endTime
      )
      return { employeeId: assignment.employeeId, result }
    })

    const conflictResults = await Promise.all(conflictPromises)

    for (const { employeeId, result } of conflictResults) {
      results[employeeId] = result
    }

    return results
  } catch (error) {
    console.error('Error in batch conflict detection:', error)
    return {}
  }
}

// Get optimal employee suggestions for a role
export async function getOptimalEmployeeSuggestions(
  roleCode: RoleCode,
  date: string,
  startTime: string,
  endTime: string,
  excludeEmployeeIds: string[] = []
): Promise<Array<{
  employeeId: string
  employeeName: string
  score: number
  conflicts: ConflictDetectionResult
  reason: string
}>> {
  try {
    // Get available employees with required skills
    const availableEmployeesQuery = `
      SELECT 
        u.id,
        u.name,
        u.crew_chief_eligible,
        u.fork_operator_eligible,
        u.role,
        u.performance
      FROM users u
      WHERE u.role IN ('Employee', 'Crew Chief', 'Admin')
        AND u.id NOT IN (${excludeEmployeeIds.map((_, i) => `$${i + 5}`).join(',')})
        AND (
          ($1 = 'CC' AND (u.crew_chief_eligible = true OR u.role IN ('Crew Chief', 'Admin'))) OR
          ($1 IN ('FO', 'RFO') AND (u.fork_operator_eligible = true OR u.role = 'Admin')) OR
          ($1 IN ('SH', 'RG', 'GL'))
        )
      ORDER BY 
        u.performance DESC,
        CASE 
          WHEN u.role = 'Admin' THEN 1
          WHEN u.role = 'Crew Chief' THEN 2
          ELSE 3
        END,
        u.name
    `

    const params = [roleCode, date, startTime, endTime, ...excludeEmployeeIds]
    const employeesResult = await query(availableEmployeesQuery, params)

    const suggestions = []

    for (const employee of employeesResult.rows) {
      // Check conflicts for this employee
      const conflicts = await detectConflicts(
        employee.id,
        'temp_shift_id', // Temporary ID for conflict checking
        roleCode,
        date,
        startTime,
        endTime
      )

      // Calculate score based on performance and conflicts
      let score = employee.performance || 3 // Default performance score
      
      // Reduce score for conflicts
      if (conflicts.timeConflicts.length > 0) {
        const highSeverityConflicts = conflicts.timeConflicts.filter(c => c.severity === 'high').length
        const mediumSeverityConflicts = conflicts.timeConflicts.filter(c => c.severity === 'medium').length
        score -= (highSeverityConflicts * 2) + (mediumSeverityConflicts * 1)
      }

      if (conflicts.skillConflicts.length > 0) {
        score -= 3 // Significant penalty for skill conflicts
      }

      // Bonus for role match
      if (roleCode === 'CC' && employee.role === 'Crew Chief') {
        score += 1
      }

      let reason = `Performance: ${employee.performance || 3}/5`
      if (conflicts.hasConflicts) {
        reason += `, ${conflicts.timeConflicts.length + conflicts.skillConflicts.length} conflict(s)`
      }

      suggestions.push({
        employeeId: employee.id,
        employeeName: employee.name,
        score: Math.max(0, score), // Ensure score doesn't go negative
        conflicts,
        reason
      })
    }

    // Sort by score (highest first)
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10) // Return top 10
  } catch (error) {
    console.error('Error getting optimal employee suggestions:', error)
    return []
  }
}
