"use client"

import React, { useState, useEffect } from "react"
import { CustomButton } from '@/components/ui/custom-button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'

import { Users, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleCode } from "@/lib/types";

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface WorkerRequirementsProps {
  shiftId: string;
  workerRequirements?: WorkerRequirement[];
  onUpdate?: (updatedRequirements: WorkerRequirement[]) => void;
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; roleColor: "purple" | "blue" | "green" | "yellow" | "red" | "gray"; cardBgColor: string; textColor: string; borderColor: string; }> = {
  'CC': { name: 'Crew Chief', roleColor: 'purple', cardBgColor: 'bg-purple-50 dark:bg-purple-900/30', textColor: 'text-purple-900 dark:text-purple-100', borderColor: 'border-purple-200 dark:border-purple-700' },
  'SH': { name: 'Stage Hand', roleColor: 'blue', cardBgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-900 dark:text-blue-100', borderColor: 'border-blue-200 dark:border-blue-700' },
  'FO': { name: 'Fork Operator', roleColor: 'green', cardBgColor: 'bg-green-50 dark:bg-green-900/30', textColor: 'text-green-900 dark:text-green-100', borderColor: 'border-green-200 dark:border-green-700' },
  'RFO': { name: 'Reach Fork Operator', roleColor: 'yellow', cardBgColor: 'bg-yellow-50 dark:bg-yellow-900/30', textColor: 'text-yellow-900 dark:text-yellow-100', borderColor: 'border-yellow-200 dark:border-yellow-700' },
  'RG': { name: 'Rigger', roleColor: 'red', cardBgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-900 dark:text-red-100', borderColor: 'border-red-200 dark:border-red-700' },
  'GL': { name: 'General Labor', roleColor: 'gray', cardBgColor: 'bg-gray-100 dark:bg-gray-800/30', textColor: 'text-gray-900 dark:text-gray-100', borderColor: 'border-gray-200 dark:border-gray-700' },
} as const

export default function WorkerRequirements({ shiftId, workerRequirements: propWorkerRequirements, onUpdate }: WorkerRequirementsProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>(propWorkerRequirements || [])
  const [isLoading, setIsLoading] = useState(!propWorkerRequirements)

  // Fetch worker requirements if not provided as props
  useEffect(() => {
    if (!propWorkerRequirements && shiftId) {
      fetchWorkerRequirements()
    } else if (propWorkerRequirements) {
      // Update local state when props change
      setWorkerRequirements(propWorkerRequirements)
      setIsLoading(false)
    }
  }, [shiftId, propWorkerRequirements])

  const fetchWorkerRequirements = async () => {
    try {
      setIsLoading(true)
      console.log(`Fetching worker requirements for shift ${shiftId}`)

      const response = await fetch(`/api/shifts/${shiftId}/worker-requirements`)
      if (response.ok) {
        const result = await response.json()
        console.log('Fetched worker requirements:', result.data.workerRequirements)
        setWorkerRequirements(result.data.workerRequirements)
      } else {
        console.warn('Failed to fetch worker requirements, using defaults. Status:', response.status)
        // If no data exists, initialize with default values
        const defaultRequirements: WorkerRequirement[] = [
          { roleCode: 'CC', requiredCount: 1 },
          { roleCode: 'SH', requiredCount: 0 },
          { roleCode: 'FO', requiredCount: 0 },
          { roleCode: 'RFO', requiredCount: 0 },
          { roleCode: 'RG', requiredCount: 0 },
          { roleCode: 'GL', requiredCount: 0 },
        ]
        setWorkerRequirements(defaultRequirements)
      }
    } catch (error) {
      console.error('Error fetching worker requirements:', error)

      // Fallback to default values on error
      const defaultRequirements: WorkerRequirement[] = [
        { roleCode: 'CC', requiredCount: 1 },
        { roleCode: 'SH', requiredCount: 0 },
        { roleCode: 'FO', requiredCount: 0 },
        { roleCode: 'RFO', requiredCount: 0 },
        { roleCode: 'RG', requiredCount: 0 },
        { roleCode: 'GL', requiredCount: 0 },
      ]
      setWorkerRequirements(defaultRequirements)

      toast({
        title: "Error",
        description: "Failed to load worker requirements, using defaults",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateWorkerRequirement = async (roleCode: RoleCode, newCount: number) => {
    if (isUpdating || newCount < 0) return

    console.log(`Updating ${roleCode} requirement to ${newCount}`)

    // Optimistic update - update UI immediately
    const allRoleTypes: RoleCode[] = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']
    const optimisticRequirements: WorkerRequirement[] = allRoleTypes.map(role => {
      if (role === roleCode) {
        // Crew chief is always fixed at 1, ignore any other value
        const finalCount = role === 'CC' ? 1 : newCount
        return { roleCode: role, requiredCount: finalCount }
      }
      const existing = workerRequirements.find(req => req.roleCode === role)
      // Ensure crew chief is always 1 even if not being updated
      if (role === 'CC') {
        return { roleCode: role, requiredCount: 1 }
      }
      return existing || { roleCode: role, requiredCount: 0 }
    })

    console.log('Optimistic requirements:', optimisticRequirements)

    // Update UI immediately for better UX
    setWorkerRequirements(optimisticRequirements)
    setIsUpdating(true)

    try {
      console.log('Sending API request to update worker requirements')
      const response = await fetch(`/api/shifts/${shiftId}/worker-requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerRequirements: optimisticRequirements })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update worker requirements')
      }

      // Confirm the update was successful
      const responseData = await response.json()
      console.log('Worker requirements updated successfully:', responseData)

      // Call parent callback if provided
      if (onUpdate) {
        onUpdate(optimisticRequirements)
      }
      toast({
        title: "Requirements Updated",
        description: `${ROLE_DEFINITIONS[roleCode].name} requirement set to ${roleCode === 'CC' ? 1 : newCount}`,
      })
    } catch (error) {
      console.error('Error updating worker requirement:', error)

      // Revert optimistic update on error
      await fetchWorkerRequirements()

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update worker requirements",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getRequiredCount = (roleCode: RoleCode): number => {
    // Crew chief is always fixed at 1
    if (roleCode === 'CC') {
      return 1
    }
    // Handle case where workerRequirements is undefined or null
    if (!workerRequirements || !Array.isArray(workerRequirements)) {
      return 0
    }
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Requirements
          </CardTitle>
          <CardDescription>
            Loading worker requirements...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Requirements
        </CardTitle>
        <CardDescription>
          Configure how many workers of each type are needed for this shift
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
            const currentCount = getRequiredCount(roleCode)
            const isCrewChief = roleCode === 'CC'

            return (
              <div key={roleCode} className={`p-4 rounded-lg border ${roleDef.cardBgColor} ${roleDef.borderColor} flex flex-col sm:flex-row sm:items-center sm:justify-between`}>
                <div className="flex items-center justify-between sm:justify-start mb-3 sm:mb-0">
                  <div className="flex-grow">
                    <span className={`font-bold text-lg ${roleDef.textColor}`}>{roleDef.name}</span>
                    <Badge variant="secondary" className="ml-2">{roleCode}</Badge>
                    {isCrewChief && (
                      <Badge variant="outline" className="ml-2 border-purple-500 text-purple-700">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center w-full">
                  {isCrewChief ? (
                    // Fixed crew chief display - always 1
                    <div className="flex items-center gap-2 flex-grow justify-center">
                      <span className={`w-16 text-center font-bold text-2xl ${roleDef.textColor} bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-lg border-2 border-purple-300`}>
                        1
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        (Fixed - Every shift requires exactly 1 crew chief)
                      </span>
                    </div>
                  ) : (
                    // Dynamic controls for other worker types
                    <div className="flex items-center gap-2 flex-grow">
                      <CustomButton
                        size="sm"
                        variant="role"
                        roleColor={roleDef.roleColor}
                        onClick={() => updateWorkerRequirement(roleCode, currentCount - 5)}
                        disabled={currentCount < 5 || isUpdating}
                        className="flex-1"
                      >
                        -5
                      </CustomButton>
                      <CustomButton
                        size="sm"
                        variant="role"
                        roleColor={roleDef.roleColor}
                        onClick={() => updateWorkerRequirement(roleCode, currentCount - 1)}
                        disabled={currentCount === 0 || isUpdating}
                        className="flex-1"
                      >
                        <Minus className="h-4 w-4" />
                      </CustomButton>
                      <span className={`w-16 text-center font-bold text-2xl ${roleDef.textColor}`}>{currentCount}</span>
                      <CustomButton
                        size="sm"
                        variant="role"
                        roleColor={roleDef.roleColor}
                        onClick={() => updateWorkerRequirement(roleCode, currentCount + 1)}
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4" />
                      </CustomButton>
                      <CustomButton
                        size="sm"
                        variant="role"
                        roleColor={roleDef.roleColor}
                        onClick={() => updateWorkerRequirement(roleCode, currentCount + 5)}
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        +5
                      </CustomButton>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}