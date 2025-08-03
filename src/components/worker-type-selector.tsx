"use client"

import React, { useState, useEffect } from "react"
import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, Users } from "lucide-react"
import { RoleCode } from "@/lib/types"

interface WorkerRequirement {
  roleCode: RoleCode
  roleName: string
  count: number
  color: string
}

interface WorkerTypeSelectorProps {
  value?: WorkerRequirement[]
  onChange: (requirements: WorkerRequirement[], totalCount: number) => void
  className?: string
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string; bgColor: string; description: string }> = {
  'CC': { 
    name: 'Crew Chief', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    description: 'Supervises the crew and manages the shift'
  },
  'SH': { 
    name: 'Stage Hand', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    description: 'General labor and equipment handling'
  },
  'FO': { 
    name: 'Fork Operator', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    description: 'Operates forklift and heavy machinery'
  },
  'RFO': { 
    name: 'Reach Fork Operator', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    description: 'Operates reach forklift for high stacking'
  },
  'RG': { 
    name: 'Rigger', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    description: 'Specialized rigging and lifting operations'
  },
  'GL': { 
    name: 'General Labor', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    description: 'Basic labor and support tasks'
  },
}

export default function WorkerTypeSelector({ value = [], onChange, className }: WorkerTypeSelectorProps) {
  const [requirements, setRequirements] = useState<WorkerRequirement[]>(value)

  // Initialize with default crew chief if empty
  useEffect(() => {
    if (value.length === 0 && requirements.length === 0) {
      const defaultRequirements = [
        {
          roleCode: 'CC' as RoleCode,
          roleName: ROLE_DEFINITIONS.CC.name,
          count: 1,
          color: ROLE_DEFINITIONS.CC.color
        }
      ]
      setRequirements(defaultRequirements)
      onChange(defaultRequirements, 1)
    } else if (value.length > 0) {
      setRequirements(value)
    }
  }, [value, onChange])

  const updateRequirement = (roleCode: RoleCode, newCount: number) => {
    const updatedRequirements = requirements.map(req => 
      req.roleCode === roleCode ? { ...req, count: Math.max(0, newCount) } : req
    )

    // Add new role if it doesn't exist and count > 0
    if (newCount > 0 && !requirements.find(req => req.roleCode === roleCode)) {
      updatedRequirements.push({
        roleCode,
        roleName: ROLE_DEFINITIONS[roleCode].name,
        count: newCount,
        color: ROLE_DEFINITIONS[roleCode].color
      })
    }

    const filteredRequirements = updatedRequirements.filter(req => req.count > 0)
    const totalCount = filteredRequirements.reduce((sum, req) => sum + req.count, 0)

    setRequirements(filteredRequirements)
    onChange(filteredRequirements, totalCount)
  }

  const getCurrentCount = (roleCode: RoleCode) => {
    return requirements.find(req => req.roleCode === roleCode)?.count || 0
  }

  const getTotalWorkers = () => {
    return requirements.reduce((sum, req) => sum + req.count, 0)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Requirements
        </CardTitle>
        <CardDescription>
          Configure how many workers of each type are needed for this shift
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Summary */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="font-medium">Total Workers Requested:</span>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {getTotalWorkers()}
          </Badge>
        </div>

        {/* Worker Type Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ROLE_DEFINITIONS).map(([roleCode, roleDef]) => {
            const currentCount = getCurrentCount(roleCode as RoleCode)
            
            return (
              <div key={roleCode} className={`p-4 rounded-lg border-2 transition-all ${
                currentCount > 0 
                  ? `${roleDef.bgColor} border-current` 
                  : 'bg-muted/50 border-muted'
              }`}>
                <div className="space-y-3">
                  {/* Role Header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={currentCount > 0 ? roleDef.color : 'text-muted-foreground'}>
                          {roleCode}
                        </Badge>
                        <span className={`font-medium ${currentCount > 0 ? roleDef.color : 'text-muted-foreground'}`}>
                          {roleDef.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {roleDef.description}
                      </p>
                    </div>
                  </div>

                  {/* Counter Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateRequirement(roleCode as RoleCode, currentCount - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-lg">
                        {currentCount}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateRequirement(roleCode as RoleCode, currentCount + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {currentCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentCount === 1 ? '1 worker' : `${currentCount} workers`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Presets:</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const preset = [
                  { roleCode: 'CC' as RoleCode, roleName: ROLE_DEFINITIONS.CC.name, count: 1, color: ROLE_DEFINITIONS.CC.color }
                ]
                setRequirements(preset)
                onChange(preset, 1)
              }}
            >
              Solo Crew Chief
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const preset = [
                  { roleCode: 'CC' as RoleCode, roleName: ROLE_DEFINITIONS.CC.name, count: 1, color: ROLE_DEFINITIONS.CC.color },
                  { roleCode: 'SH' as RoleCode, roleName: ROLE_DEFINITIONS.SH.name, count: 3, color: ROLE_DEFINITIONS.SH.color }
                ]
                setRequirements(preset)
                onChange(preset, 4)
              }}
            >
              Small Crew (4)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const preset = [
                  { roleCode: 'CC' as RoleCode, roleName: ROLE_DEFINITIONS.CC.name, count: 1, color: ROLE_DEFINITIONS.CC.color },
                  { roleCode: 'SH' as RoleCode, roleName: ROLE_DEFINITIONS.SH.name, count: 6, color: ROLE_DEFINITIONS.SH.color },
                  { roleCode: 'FO' as RoleCode, roleName: ROLE_DEFINITIONS.FO.name, count: 2, color: ROLE_DEFINITIONS.FO.color }
                ]
                setRequirements(preset)
                onChange(preset, 9)
              }}
            >
              Medium Crew (9)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const preset = [
                  { roleCode: 'CC' as RoleCode, roleName: ROLE_DEFINITIONS.CC.name, count: 2, color: ROLE_DEFINITIONS.CC.color },
                  { roleCode: 'SH' as RoleCode, roleName: ROLE_DEFINITIONS.SH.name, count: 10, color: ROLE_DEFINITIONS.SH.color },
                  { roleCode: 'FO' as RoleCode, roleName: ROLE_DEFINITIONS.FO.name, count: 3, color: ROLE_DEFINITIONS.FO.color },
                  { roleCode: 'RG' as RoleCode, roleName: ROLE_DEFINITIONS.RG.name, count: 2, color: ROLE_DEFINITIONS.RG.color }
                ]
                setRequirements(preset)
                onChange(preset, 17)
              }}
            >
              Large Crew (17)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRequirements([])
                onChange([], 0)
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
