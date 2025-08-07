'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useJobs, useUsers, useShifts } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Plus, Users } from "lucide-react"
import { generateShiftUrl } from "@/lib/url-utils"
import { useUser } from "@/hooks/use-user"
import { UserRole, User } from "@/lib/types"

interface JobShiftPageProps {
  params: {
    id: string
  }
}

export default function NewJobShiftPage({ params }: JobShiftPageProps) {
  const { id } = params
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCustomLocation, setShowCustomLocation] = useState(false)
  
  const { data: jobsData, isLoading: jobsLoading } = useJobs()
  const { data: usersData, isLoading: usersLoading } = useUsers()
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts({ jobId: id })

  // Data processing with safe fallbacks
  const users = useMemo(() => {
    try {
      // Early return for null/undefined
      if (!usersData) {
        return []
      }
      
      // Handle the API response structure: { users: User[], pagination: any }
      if (usersData && typeof usersData === 'object' && 'users' in usersData) {
        const usersList = usersData.users
        if (Array.isArray(usersList)) {
          // Additional validation that each user has required properties
          return usersList.filter((user): user is User => user && typeof user === 'object' && 'id' in user && user.id)
        }
      }
      
      // Fallback for direct array (shouldn't happen with current API)
      if (Array.isArray(usersData)) {
        return usersData.filter((user): user is User => user && typeof user === 'object' && 'id' in user && user.id)
      }
      
      console.warn("Unexpected usersData structure:", usersData, typeof usersData)
      return []
    } catch (error) {
      console.error("Error processing users data:", error, { 
        usersData, 
        type: typeof usersData,
        hasUsers: usersData && 'users' in usersData,
        usersIsArray: usersData && 'users' in usersData && Array.isArray(usersData.users)
      })
      return []
    }
  }, [usersData])

  const shifts = useMemo(() => {
    if (!shiftsData) return []
    
    try {
      // Handle direct array (current API structure)
      if (Array.isArray(shiftsData)) return shiftsData
      
      // Handle wrapped response structure: { shifts: ShiftWithDetails[] }
      if (shiftsData && typeof shiftsData === 'object' && 'shifts' in shiftsData && Array.isArray((shiftsData as any).shifts)) {
        return (shiftsData as any).shifts || []
      }
      
      console.warn('Unexpected shiftsData structure:', shiftsData)
      return []
    } catch (error) {
      console.error('Error processing shifts data:', error)
      return []
    }
  }, [shiftsData])

  const job = useMemo(() => {
    if (!jobsData) return null
    
    try {
      // Handle the API response structure: Job[] (already extracted by the apiService)
      if (Array.isArray(jobsData)) {
        return jobsData.find(j => j.id === id) || null
      }
      
      console.warn('Unexpected jobsData structure:', jobsData)
      return null
    } catch (error) {
      console.error('Error processing job data:', error)
      return null
    }
  }, [jobsData, id])

  const crewChiefs = useMemo(() => {
    try {
      // Early return if users is not ready or not an array
      if (!users || !Array.isArray(users) || users.length === 0) {
        return []
      }
      
      // Filter crew chiefs with additional safety checks
      const filtered = users.filter(u => {
        try {
          return u && typeof u === 'object' && u.role === UserRole.CrewChief
        } catch (filterError) {
          console.warn('Error checking user role:', filterError, u)
          return false
        }
      })
      
      return Array.isArray(filtered) ? filtered : []
    } catch (error) {
      console.error('Error filtering crew chiefs:', error, { 
        users, 
        usersType: typeof users, 
        usersIsArray: Array.isArray(users),
        usersLength: Array.isArray(users) ? users.length : 'N/A'
      })
      return []
    }
  }, [users])

  const existingLocations = useMemo(() => {
    const locations = []
    
    // Add job location as primary option if it exists
    if (job?.location?.trim()) {
      locations.push(job.location.trim())
    }
    
    // Add any additional locations from existing shifts (for flexibility)
    if (Array.isArray(shifts)) {
      try {
        const shiftLocations = shifts
          .filter(shift => shift?.location?.trim())
          .map(shift => shift.location.trim())
          .filter(location => location !== job?.location?.trim()) // Avoid duplicates
        locations.push(...shiftLocations)
      } catch (error) {
        console.error("Error processing shift locations:", error)
      }
    }
    
    return [...new Set(locations)].sort()
  }, [job, shifts])

  const [formData, setFormData] = useState({
    jobId: id,
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    customLocation: '',
    crewChiefId: '',
    workerCounts: {
      'StageHand': 2,
      'ForkOperator': 1,
      'ReachForkOperator': 0,
      'General': 0
    },
    notes: ''
  })

  // Calculate workers safely
  const totalWorkersExcludingCrewChief = useMemo(() => {
    if (!formData?.workerCounts) return 0
    return Object.values(formData.workerCounts).reduce((sum, count) => sum + (Number(count) || 0), 0)
  }, [formData?.workerCounts])

  const totalWorkers = totalWorkersExcludingCrewChief + 1 // Always +1 for crew chief

  // Authorization check
  const canCreateShift = useMemo(() => {
    if (!user || !job) return false
    return (
      user.role === UserRole.Admin ||
      (user.role === UserRole.CrewChief && job.companyId === user.companyId) ||
      (user.role === UserRole.CompanyUser && job.companyId === user.companyId)
    )
  }, [user, job])

  // Set default location to job location when job data loads
  useEffect(() => {
    if (job?.location?.trim() && !formData.location) {
      setFormData(prev => ({
        ...prev,
        location: job.location.trim()
      }))
    }
  }, [job?.location, formData.location])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  const handleSelectChange = useCallback((name: string) => (value: string) => {
    if (name === 'location') {
      if (value === 'ADD_NEW') {
        setShowCustomLocation(true)
        setFormData(prev => ({
          ...prev,
          location: '',
          customLocation: ''
        }))
      } else {
        setShowCustomLocation(false)
        setFormData(prev => ({
          ...prev,
          location: value,
          customLocation: ''
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }, [])

  const handleWorkerCountChange = useCallback((workerType: string, count: number) => {
    setFormData(prev => ({
      ...prev,
      workerCounts: {
        ...prev.workerCounts,
        [workerType]: Math.max(0, count)
      }
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const finalLocation = showCustomLocation ? formData.customLocation : formData.location

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: formData.jobId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: finalLocation,
          crewChiefId: formData.crewChiefId || null,
          requestedWorkers: Math.max(2, totalWorkers),
          workerRequirements: formData.workerCounts,
          notes: formData.notes
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create shift")
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Shift created successfully",
      })

      router.push(generateShiftUrl(result.shift.id))
    } catch (error) {
      console.error("Error creating shift: ", error)
      toast({
        title: "Error",
        description: "Failed to create shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [formData, showCustomLocation, totalWorkers, toast, router])

  // Loading state - wait for all data to be available
  if (jobsLoading || usersLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Additional safety check - ensure data is properly loaded
  if (!usersData || !jobsData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading data...</div>
      </div>
    )
  }

  // Data validation
  if (!Array.isArray(users) || !Array.isArray(crewChiefs)) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Data Loading Error</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load user data properly. Please refresh the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  // Access check
  if (!canCreateShift) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators, crew chiefs, or company users for this job can create shifts.
          </p>
        </div>
      </div>
    )
  }

  // Worker type configurations
  const workerTypes = [
    { key: 'StageHand', label: 'Stage Hands', icon: '👷', color: 'bg-blue-100 text-blue-800' },
    { key: 'ForkOperator', label: 'Fork Operators', icon: '🏗️', color: 'bg-green-100 text-green-800' },
    { key: 'ReachForkOperator', label: 'Reach Fork Ops', icon: '🚛', color: 'bg-purple-100 text-purple-800' },
    { key: 'General', label: 'General Workers', icon: '👤', color: 'bg-gray-100 text-gray-800' }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/jobs/${id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {job?.name || 'Job'}
        </Button>
        <h1 className="text-3xl font-bold font-headline">New Shift</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Information</CardTitle>
          <CardDescription>
            Create a new shift for {job?.name}. Configure field worker requirements (crew chief automatically included).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crew Chief Selection */}
              <div className="space-y-2">
                <Label htmlFor="crewChiefId">Crew Chief (Optional)</Label>
                <Select value={formData.crewChiefId} onValueChange={handleSelectChange('crewChiefId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew chief (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No crew chief assigned</SelectItem>
                    {Array.isArray(crewChiefs) && crewChiefs.map((chief) => (
                      <SelectItem key={chief.id} value={chief.id}>
                        {chief.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location {job?.location && '(defaults to job location)'}</Label>
                {!showCustomLocation ? (
                  <Select value={formData.location} onValueChange={handleSelectChange('location')}>
                    <SelectTrigger>
                      <SelectValue placeholder={job?.location ? `${job.location} (job location)` : "Select location"} />
                    </SelectTrigger>
                    <SelectContent>
                      {existingLocations.length > 0 && (
                        <>
                          {existingLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                          <hr className="my-1" />
                        </>
                      )}
                      <SelectItem value="ADD_NEW">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add new location
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="customLocation"
                      name="customLocation"
                      value={formData.customLocation}
                      onChange={handleInputChange}
                      placeholder="Enter new location"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCustomLocation(false)
                        setFormData(prev => ({
                          ...prev,
                          location: '',
                          customLocation: ''
                        }))
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Worker Requirements Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-lg font-semibold">Field Worker Requirements</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure field workers needed (1 crew chief automatically included in total)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Total Workers: {totalWorkers}
                  </Badge>
                  <Badge variant="outline">
                    {totalWorkersExcludingCrewChief} field workers + 1 crew chief
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {workerTypes.map((workerType) => (
                  <Card key={workerType.key} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{workerType.icon}</span>
                          <div>
                            <Label className="text-sm font-medium">{workerType.label}</Label>
                          </div>
                        </div>
                        <Badge className={workerType.color}>
                          {formData?.workerCounts?.[workerType.key] || 0}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleWorkerCountChange(workerType.key, (formData?.workerCounts?.[workerType.key] || 0) - 1)}
                          disabled={(formData?.workerCounts?.[workerType.key] || 0) === 0}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={formData?.workerCounts?.[workerType.key] || 0}
                          onChange={(e) => handleWorkerCountChange(workerType.key, parseInt(e.target.value) || 0)}
                          className="h-8 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleWorkerCountChange(workerType.key, (formData?.workerCounts?.[workerType.key] || 0) + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/jobs/${id}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading || 
                  !formData.date || 
                  !formData.startTime || 
                  !formData.endTime ||
                  totalWorkersExcludingCrewChief === 0 ||
                  (showCustomLocation && !formData.customLocation.trim())
                }
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : `Create Shift (${totalWorkers} total workers)`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useJobs, useUsers, useShifts } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Plus, Users } from "lucide-react"
import { generateShiftUrl } from "@/lib/url-utils"
import { useUser } from "@/hooks/use-user"
import { UserRole } from "@/lib/types"

interface JobShiftPageProps {
  params: {
    id: string
  }
}

export default function NewJobShiftPage({ params }: JobShiftPageProps) {
  const { id } = params
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCustomLocation, setShowCustomLocation] = useState(false)
  
  const { data: jobsData, isLoading: jobsLoading } = useJobs()
  const { data: usersData, isLoading: usersLoading } = useUsers()
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts({ jobId: id })

  // Data processing with safe fallbacks
  const users = useMemo(() => {
    try {
      // Early return for null/undefined
      if (!usersData) {
        return []
      }
      
      // Handle the API response structure: { users: User[], pagination: any }
      if (usersData && typeof usersData === 'object' && 'users' in usersData) {
        const usersList = usersData.users
        if (Array.isArray(usersList)) {
          // Additional validation that each user has required properties
          return usersList.filter(user => user && typeof user === 'object' && user.id)
        }
      }
      
      // Fallback for direct array (shouldn't happen with current API)
      if (Array.isArray(usersData)) {
        return usersData.filter(user => user && typeof user === 'object' && user.id)
      }
      
      console.warn("Unexpected usersData structure:", usersData, typeof usersData)
      return []
    } catch (error) {
      console.error("Error processing users data:", error, { 
        usersData, 
        type: typeof usersData,
        hasUsers: usersData && 'users' in usersData,
        usersIsArray: usersData && 'users' in usersData && Array.isArray(usersData.users)
      })
      return []
    }
  }, [usersData])

  const shifts = useMemo(() => {
    if (!shiftsData) return []
    
    try {
      // Handle direct array (current API structure)
      if (Array.isArray(shiftsData)) return shiftsData
      
      // Handle wrapped response structure: { shifts: ShiftWithDetails[] }
      if (shiftsData && typeof shiftsData === 'object' && 'shifts' in shiftsData && Array.isArray((shiftsData as any).shifts)) {
        return (shiftsData as any).shifts || []
      }
      
      console.warn('Unexpected shiftsData structure:', shiftsData)
      return []
    } catch (error) {
      console.error('Error processing shifts data:', error)
      return []
    }
  }, [shiftsData])

  const job = useMemo(() => {
    if (!jobsData) return null
    
    try {
      // Handle the API response structure: Job[] (already extracted by the apiService)
      if (Array.isArray(jobsData)) {
        return jobsData.find(j => j.id === id) || null
      }
      
      console.warn('Unexpected jobsData structure:', jobsData)
      return null
    } catch (error) {
      console.error('Error processing job data:', error)
      return null
    }
  }, [jobsData, id])

  const crewChiefs = useMemo(() => {
    try {
      // Early return if users is not ready or not an array
      if (!users || !Array.isArray(users) || users.length === 0) {
        return []
      }
      
      // Filter crew chiefs with additional safety checks
      const filtered = users.filter(u => {
        try {
          return u && typeof u === 'object' && u.role === UserRole.CrewChief
        } catch (filterError) {
          console.warn('Error checking user role:', filterError, u)
          return false
        }
      })
      
      return Array.isArray(filtered) ? filtered : []
    } catch (error) {
      console.error('Error filtering crew chiefs:', error, { 
        users, 
        usersType: typeof users, 
        usersIsArray: Array.isArray(users),
        usersLength: Array.isArray(users) ? users.length : 'N/A'
      })
      return []
    }
  }, [users])

  const existingLocations = useMemo(() => {
    const locations = []
    
    // Add job location as primary option if it exists
    if (job?.location?.trim()) {
      locations.push(job.location.trim())
    }
    
    // Add any additional locations from existing shifts (for flexibility)
    if (Array.isArray(shifts)) {
      try {
        const shiftLocations = shifts
          .filter(shift => shift?.location?.trim())
          .map(shift => shift.location.trim())
          .filter(location => location !== job?.location?.trim()) // Avoid duplicates
        locations.push(...shiftLocations)
      } catch (error) {
        console.error("Error processing shift locations:", error)
      }
    }
    
    return [...new Set(locations)].sort()
  }, [job, shifts])

  const [formData, setFormData] = useState({
    jobId: id,
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    customLocation: '',
    crewChiefId: '',
    workerCounts: {
      'StageHand': 2,
      'ForkOperator': 1,
      'ReachForkOperator': 0,
      'General': 0
    },
    notes: ''
  })

  // Calculate workers safely
  const totalWorkersExcludingCrewChief = useMemo(() => {
    if (!formData?.workerCounts) return 0
    return Object.values(formData.workerCounts).reduce((sum, count) => sum + (Number(count) || 0), 0)
  }, [formData?.workerCounts])

  const totalWorkers = totalWorkersExcludingCrewChief + 1 // Always +1 for crew chief

  // Authorization check
  const canCreateShift = useMemo(() => {
    if (!user || !job) return false
    return (
      user.role === UserRole.Admin ||
      (user.role === UserRole.CrewChief && job.companyId === user.companyId) ||
      (user.role === UserRole.CompanyUser && job.companyId === user.companyId)
    )
  }, [user, job])

  // Set default location to job location when job data loads
  useEffect(() => {
    if (job?.location?.trim() && !formData.location) {
      setFormData(prev => ({
        ...prev,
        location: job.location.trim()
      }))
    }
  }, [job?.location, formData.location])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  const handleSelectChange = useCallback((name: string) => (value: string) => {
    if (name === 'location') {
      if (value === 'ADD_NEW') {
        setShowCustomLocation(true)
        setFormData(prev => ({
          ...prev,
          location: '',
          customLocation: ''
        }))
      } else {
        setShowCustomLocation(false)
        setFormData(prev => ({
          ...prev,
          location: value,
          customLocation: ''
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }, [])

  const handleWorkerCountChange = useCallback((workerType: string, count: number) => {
    setFormData(prev => ({
      ...prev,
      workerCounts: {
        ...prev.workerCounts,
        [workerType]: Math.max(0, count)
      }
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const finalLocation = showCustomLocation ? formData.customLocation : formData.location

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: formData.jobId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: finalLocation,
          crewChiefId: formData.crewChiefId || null,
          requestedWorkers: Math.max(2, totalWorkers),
          workerRequirements: formData.workerCounts,
          notes: formData.notes
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create shift")
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Shift created successfully",
      })

      router.push(generateShiftUrl(result.shift.id))
    } catch (error) {
      console.error("Error creating shift: ", error)
      toast({
        title: "Error",
        description: "Failed to create shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [formData, showCustomLocation, totalWorkers, toast, router])

  // Loading state - wait for all data to be available
  if (jobsLoading || usersLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Additional safety check - ensure data is properly loaded
  if (!usersData || !jobsData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading data...</div>
      </div>
    )
  }

  // Data validation
  if (!Array.isArray(users) || !Array.isArray(crewChiefs)) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Data Loading Error</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load user data properly. Please refresh the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  // Access check
  if (!canCreateShift) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators, crew chiefs, or company users for this job can create shifts.
          </p>
        </div>
      </div>
    )
  }

  // Worker type configurations
  const workerTypes = [
    { key: 'StageHand', label: 'Stage Hands', icon: '👷', color: 'bg-blue-100 text-blue-800' },
    { key: 'ForkOperator', label: 'Fork Operators', icon: '🏗️', color: 'bg-green-100 text-green-800' },
    { key: 'ReachForkOperator', label: 'Reach Fork Ops', icon: '🚛', color: 'bg-purple-100 text-purple-800' },
    { key: 'General', label: 'General Workers', icon: '👤', color: 'bg-gray-100 text-gray-800' }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/jobs/${id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {job?.name || 'Job'}
        </Button>
        <h1 className="text-3xl font-bold font-headline">New Shift</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Information</CardTitle>
          <CardDescription>
            Create a new shift for {job?.name}. Configure field worker requirements (crew chief automatically included).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crew Chief Selection */}
              <div className="space-y-2">
                <Label htmlFor="crewChiefId">Crew Chief (Optional)</Label>
                <Select value={formData.crewChiefId} onValueChange={handleSelectChange('crewChiefId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew chief (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No crew chief assigned</SelectItem>
                    {Array.isArray(crewChiefs) && crewChiefs.map((chief) => (
                      <SelectItem key={chief.id} value={chief.id}>
                        {chief.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location {job?.location && '(defaults to job location)'}</Label>
                {!showCustomLocation ? (
                  <Select value={formData.location} onValueChange={handleSelectChange('location')}>
                    <SelectTrigger>
                      <SelectValue placeholder={job?.location ? `${job.location} (job location)` : "Select location"} />
                    </SelectTrigger>
                    <SelectContent>
                      {existingLocations.length > 0 && (
                        <>
                          {existingLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                          <hr className="my-1" />
                        </>
                      )}
                      <SelectItem value="ADD_NEW">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add new location
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="customLocation"
                      name="customLocation"
                      value={formData.customLocation}
                      onChange={handleInputChange}
                      placeholder="Enter new location"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCustomLocation(false)
                        setFormData(prev => ({
                          ...prev,
                          location: '',
                          customLocation: ''
                        }))
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Worker Requirements Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-lg font-semibold">Field Worker Requirements</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure field workers needed (1 crew chief automatically included in total)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Total Workers: {totalWorkers}
                  </Badge>
                  <Badge variant="outline">
                    {totalWorkersExcludingCrewChief} field workers + 1 crew chief
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {workerTypes.map((workerType) => (
                  <Card key={workerType.key} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{workerType.icon}</span>
                          <div>
                            <Label className="text-sm font-medium">{workerType.label}</Label>
                          </div>
                        </div>
                        <Badge className={workerType.color}>
                          {formData?.workerCounts?.[workerType.key] || 0}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleWorkerCountChange(workerType.key, (formData?.workerCounts?.[workerType.key] || 0) - 1)}
                          disabled={(formData?.workerCounts?.[workerType.key] || 0) === 0}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={formData?.workerCounts?.[workerType.key] || 0}
                          onChange={(e) => handleWorkerCountChange(workerType.key, parseInt(e.target.value) || 0)}
                          className="h-8 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleWorkerCountChange(workerType.key, (formData?.workerCounts?.[workerType.key] || 0) + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/jobs/${id}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading || 
                  !formData.date || 
                  !formData.startTime || 
                  !formData.endTime ||
                  totalWorkersExcludingCrewChief === 0 ||
                  (showCustomLocation && !formData.customLocation.trim())
                }
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : `Create Shift (${totalWorkers} total workers)`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}