// Enhanced Scheduling Timeline Dashboard - Desktop Optimized
// Features:
// - Visual timeline with color-coded worker types and staffing indicators
// - Multiple view modes: Timeline, List, and Grid views
// - Advanced filtering: search, status, department, location, worker type
// - Meeting mode with critical gap highlighting and focused problem tracking
// - Real-time auto-refresh capabilities
// - Enhanced export options: JSON, CSV, PDF with meeting-focused formats
// - Interactive controls for zoom, date navigation, and view settings
// - Comprehensive staffing analytics and progress tracking
// - Desktop-optimized design with expanded view options
// - Team collaboration features for assignment meetings

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format, parseISO, addDays, differenceInHours, differenceInMinutes, isSameDay, isAfter, isBefore, isToday, startOfDay, endOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Clock, Users, User, UserCheck, Truck, CalendarDays, Filter, X, Info, AlertCircle, CheckCircle, PlusCircle, Edit, Download, FileText, Printer, RefreshCw, Search, Settings, Eye, EyeOff, BarChart3, TrendingUp, UserPlus, MapPin, Building } from 'lucide-react'

// Types
interface SchedulingTimelineProps {
  jobId: string
}

interface TimelineShift {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  status: string
  location: string
  description: string
  department: string
  requestedWorkers: number
  requiredCrewChiefs: number
  requiredStagehands: number
  requiredForkOperators: number
  requiredReachForkOperators: number
  requiredRiggers: number
  requiredGeneralLaborers: number
  crewChiefs: CrewMember[]
  workers: WorkersByType
}

interface CrewMember {
  id: string
  name: string
  avatar: string
  status: string
  roleCode: string
}

interface WorkersByType {
  [roleCode: string]: CrewMember[]
}

interface JobSummary {
  id: string
  name: string
  company: {
    id: string
    name: string
    logo: string
  }
  startDate: Date
  endDate: Date
  status: string
  location: string
}

// Enhanced Worker type definitions with modern gradients and improved styling
const WORKER_TYPES = {
  'CC': { 
    bg: 'bg-gradient-to-br from-red-50 via-red-100 to-red-200', 
    text: 'text-red-900', 
    border: 'border-red-400',
    accent: 'bg-red-500',
    shadow: 'shadow-red-200',
    ring: 'ring-red-300',
    label: 'Crew Chief',
    icon: <UserCheck className="h-4 w-4" />,
    color: '#dc2626'
  },
  'SH': { 
    bg: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200', 
    text: 'text-blue-900', 
    border: 'border-blue-400',
    accent: 'bg-blue-500',
    shadow: 'shadow-blue-200',
    ring: 'ring-blue-300',
    label: 'Stagehand',
    icon: <User className="h-4 w-4" />,
    color: '#2563eb'
  },
  'FO': { 
    bg: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200', 
    text: 'text-emerald-900', 
    border: 'border-emerald-400',
    accent: 'bg-emerald-500',
    shadow: 'shadow-emerald-200',
    ring: 'ring-emerald-300',
    label: 'Fork Operator',
    icon: <Truck className="h-4 w-4" />,
    color: '#059669'
  },
  'RFO': { 
    bg: 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200', 
    text: 'text-teal-900', 
    border: 'border-teal-400',
    accent: 'bg-teal-500',
    shadow: 'shadow-teal-200',
    ring: 'ring-teal-300',
    label: 'Reach Fork Operator',
    icon: <Truck className="h-4 w-4" />,
    color: '#0d9488'
  },
  'RG': { 
    bg: 'bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200', 
    text: 'text-purple-900', 
    border: 'border-purple-400',
    accent: 'bg-purple-500',
    shadow: 'shadow-purple-200',
    ring: 'ring-purple-300',
    label: 'Rigger',
    icon: <User className="h-4 w-4" />,
    color: '#7c3aed'
  },
  'GL': { 
    bg: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200', 
    text: 'text-orange-900', 
    border: 'border-orange-400',
    accent: 'bg-orange-500',
    shadow: 'shadow-orange-200',
    ring: 'ring-orange-300',
    label: 'General Laborer',
    icon: <User className="h-4 w-4" />,
    color: '#ea580c'
  },
  'SUP': { 
    bg: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200', 
    text: 'text-amber-900', 
    border: 'border-amber-400',
    accent: 'bg-amber-500',
    shadow: 'shadow-amber-200',
    ring: 'ring-amber-300',
    label: 'Supervisor',
    icon: <UserCheck className="h-4 w-4" />,
    color: '#d97706'
  },
  'WR': { 
    bg: 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200', 
    text: 'text-slate-900', 
    border: 'border-slate-400',
    accent: 'bg-slate-500',
    shadow: 'shadow-slate-200',
    ring: 'ring-slate-300',
    label: 'Worker',
    icon: <User className="h-4 w-4" />,
    color: '#475569'
  }
};

// Enhanced Status color mapping with gradients and modern styling
const STATUS_COLORS = {
  'Pending': 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500',
  'Active': 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
  'InProgress': 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
  'Completed': 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600',
  'Cancelled': 'bg-gradient-to-r from-red-500 via-red-600 to-rose-600',
  'Scheduled': 'bg-gradient-to-r from-slate-500 via-slate-600 to-gray-600'
};

// Enhanced Worker status color mapping with better visual hierarchy
const WORKER_STATUS_COLORS = {
  'Assigned': '#3b82f6',
  'ClockedIn': '#10b981',
  'OnBreak': '#f59e0b',
  'ClockedOut': '#ef4444',
  'ShiftEnded': '#8b5cf6',
  'NoShow': '#6b7280',
  'UpForGrabs': '#f97316'
};

// Staffing level color scheme for better visual feedback
const STAFFING_COLORS = {
  critical: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100',
    border: 'border-red-400',
    text: 'text-red-900',
    accent: 'bg-red-500',
    shadow: 'shadow-red-200/50',
    ring: 'ring-red-300'
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-900',
    accent: 'bg-amber-500',
    shadow: 'shadow-amber-200/50',
    ring: 'ring-amber-300'
  },
  good: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-900',
    accent: 'bg-emerald-500',
    shadow: 'shadow-emerald-200/50',
    ring: 'ring-emerald-300'
  },
  complete: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    border: 'border-green-400',
    text: 'text-green-900',
    accent: 'bg-green-500',
    shadow: 'shadow-green-200/50',
    ring: 'ring-green-300'
  }
};

export default function SchedulingTimelineDashboard({ jobId }: SchedulingTimelineProps) {
  const [jobData, setJobData] = useState<JobSummary | null>(null)
  const [shifts, setShifts] = useState<TimelineShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Timeline state
  const [visibleDates, setVisibleDates] = useState<Date[]>([])
  const [zoomLevel, setZoomLevel] = useState(3) // 1: day, 2: 3-day, 3: week - Default to week view for desktop
  const [visibleHoursRange, setVisibleHoursRange] = useState<[number, number]>([5, 24]) // 5am to midnight - Expanded for desktop
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [filterWorkerType, setFilterWorkerType] = useState<string | null>(null)
  const [showUnderfilledOnly, setShowUnderfilledOnly] = useState(false)
  const [showAssignmentStats, setShowAssignmentStats] = useState(true)
  
  // Enhanced filtering and view options
  const [searchQuery, setSearchQuery] = useState('')
  const [filterByStatus, setFilterByStatus] = useState<string | null>(null)
  const [filterByDepartment, setFilterByDepartment] = useState<string | null>(null)
  const [filterByLocation, setFilterByLocation] = useState<string | null>(null)
  const [showCompletedShifts, setShowCompletedShifts] = useState(true)
  const [highlightCriticalGaps, setHighlightCriticalGaps] = useState(true)
  const [compactView, setCompactView] = useState(false) // Kept for compatibility but defaults to desktop-optimized view
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'grid'>('timeline')
  
  // Meeting and export features
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json')
  const [meetingMode, setMeetingMode] = useState(false)
  const [focusedProblems, setFocusedProblems] = useState<string[]>([])
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Helper function to get staffing level styling
  const getStaffingLevelStyle = (completion: number, gap: number) => {
    if (completion >= 100) return STAFFING_COLORS.complete
    if (completion >= 80) return STAFFING_COLORS.good
    if (completion >= 50 || gap <= 2) return STAFFING_COLORS.warning
    return STAFFING_COLORS.critical
  }
  
  // Enhanced data fetching with refresh capabilities
  const fetchJobData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const response = await fetch(`/api/jobs/${jobId}/scheduling-timeline`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch job data')
      }
      
      const data = await response.json()
      
      // Transform dates from strings to Date objects
      const jobSummary: JobSummary = {
        ...data.job,
        startDate: new Date(data.job.startDate),
        endDate: new Date(data.job.endDate)
      }
      
      const transformedShifts: TimelineShift[] = data.shifts.map((shift: any) => ({
        ...shift,
        date: new Date(shift.date),
        startTime: new Date(shift.startTime),
        endTime: new Date(shift.endTime),
        // Ensure worker arrays exist
        crewChiefs: shift.crewChiefs || [],
        workers: shift.workers || {}
      }))
      
      setJobData(jobSummary)
      setShifts(transformedShifts)
      
      // Initialize visible dates based on job start date (only on initial load)
      if (!isRefresh && jobSummary.startDate && visibleDates.length === 0) {
        initializeVisibleDates(jobSummary.startDate)
      }
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [jobId, visibleDates.length])

  // Initial data fetch
  useEffect(() => {
    fetchJobData()
  }, [fetchJobData])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchJobData(true)
      }, 30000) // Refresh every 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, fetchJobData])
  
  // Initialize visible dates based on zoom level
  const initializeVisibleDates = (startDate: Date) => {
    const dates: Date[] = []
    const daysToShow = zoomLevel === 1 ? 1 : zoomLevel === 2 ? 3 : 7
    
    for (let i = 0; i < daysToShow; i++) {
      dates.push(addDays(startDate, i))
    }
    
    setVisibleDates(dates)
  }
  
  // Navigate to previous dates
  const goToPreviousDates = () => {
    const daysToShift = zoomLevel === 1 ? 1 : zoomLevel === 2 ? 3 : 7
    const newDates = visibleDates.map(date => addDays(date, -daysToShift))
    setVisibleDates(newDates)
  }
  
  // Navigate to next dates
  const goToNextDates = () => {
    const daysToShift = zoomLevel === 1 ? 1 : zoomLevel === 2 ? 3 : 7
    const newDates = visibleDates.map(date => addDays(date, daysToShift))
    setVisibleDates(newDates)
  }
  
  // Change zoom level
  const changeZoomLevel = (level: number) => {
    if (level === zoomLevel) return
    
    const currentCenterDate = visibleDates[Math.floor(visibleDates.length / 2)]
    setZoomLevel(level)
    
    // Recalculate visible dates based on new zoom level
    const dates: Date[] = []
    const daysToShow = level === 1 ? 1 : level === 2 ? 3 : 7
    const startOffset = Math.floor(daysToShow / 2)
    
    for (let i = -startOffset; i < daysToShow - startOffset; i++) {
      dates.push(addDays(currentCenterDate, i))
    }
    
    setVisibleDates(dates)
  }
  
  // Enhanced filtering for shifts
  const getVisibleShifts = () => {
    if (!shifts) return []
    
    let filteredShifts = shifts.filter(shift => 
      visibleDates.some(date => isSameDay(date, shift.date))
    )
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredShifts = filteredShifts.filter(shift => 
        shift.description?.toLowerCase().includes(query) ||
        shift.department?.toLowerCase().includes(query) ||
        shift.location?.toLowerCase().includes(query) ||
        shift.crewChiefs.some(chief => chief.name.toLowerCase().includes(query)) ||
        Object.values(shift.workers).flat().some(worker => worker.name.toLowerCase().includes(query))
      )
    }
    
    // Apply status filter
    if (filterByStatus) {
      filteredShifts = filteredShifts.filter(shift => shift.status === filterByStatus)
    }
    
    // Apply department filter
    if (filterByDepartment) {
      filteredShifts = filteredShifts.filter(shift => shift.department === filterByDepartment)
    }
    
    // Apply location filter
    if (filterByLocation) {
      filteredShifts = filteredShifts.filter(shift => shift.location === filterByLocation)
    }
    
    // Apply completed shifts filter
    if (!showCompletedShifts) {
      filteredShifts = filteredShifts.filter(shift => shift.status !== 'Completed')
    }
    
    // Apply underfilled filter if enabled
    if (showUnderfilledOnly) {
      filteredShifts = filteredShifts.filter(shift => {
        const totalAssigned = Object.values(shift.workers).flat().length + shift.crewChiefs.length
        return totalAssigned < shift.requestedWorkers
      })
    }
    
    // Apply worker type filter if enabled
    if (filterWorkerType) {
      filteredShifts = filteredShifts.filter(shift => {
        if (filterWorkerType === 'CC') {
          return shift.requiredCrewChiefs > 0
        }
        
        const requiredCount = getRequiredCountForType(shift, filterWorkerType)
        return requiredCount > 0
      })
    }
    
    // Apply critical gaps highlighting filter
    if (highlightCriticalGaps && meetingMode) {
      // In meeting mode with critical gaps, prioritize shifts with significant staffing gaps
      filteredShifts = filteredShifts.sort((a, b) => {
        const aGap = a.requestedWorkers - (Object.values(a.workers).flat().length + a.crewChiefs.length)
        const bGap = b.requestedWorkers - (Object.values(b.workers).flat().length + b.crewChiefs.length)
        return bGap - aGap // Sort by gap size descending
      })
    }
    
    return filteredShifts
  }
  
  // Get unique departments for filtering
  const getUniqueDepartments = () => {
    if (!shifts || shifts.length === 0) return []
    const departments = new Set(
      shifts
        .map(shift => shift.department)
        .filter(dept => dept && typeof dept === 'string' && dept.trim() !== '')
    )
    return Array.from(departments).sort()
  }
  
  // Get unique locations for filtering
  const getUniqueLocations = () => {
    if (!shifts || shifts.length === 0) return []
    const locations = new Set(
      shifts
        .map(shift => shift.location)
        .filter(loc => loc && typeof loc === 'string' && loc.trim() !== '')
    )
    return Array.from(locations).sort()
  }
  
  // Get unique statuses for filtering
  const getUniqueStatuses = () => {
    if (!shifts || shifts.length === 0) return []
    const statuses = new Set(
      shifts
        .map(shift => shift.status)
        .filter(status => status && typeof status === 'string' && status.trim() !== '')
    )
    return Array.from(statuses).sort()
  }
  
  // Helper to get required count for a specific worker type
  const getRequiredCountForType = (shift: TimelineShift, type: string): number => {
    switch (type) {
      case 'CC': return shift.requiredCrewChiefs
      case 'SH': return shift.requiredStagehands
      case 'FO': return shift.requiredForkOperators
      case 'RFO': return shift.requiredReachForkOperators
      case 'RG': return shift.requiredRiggers
      case 'GL': return shift.requiredGeneralLaborers
      default: return 0
    }
  }
  
  // Get assigned count for a specific worker type
  const getAssignedCountForType = (shift: TimelineShift, type: string): number => {
    if (type === 'CC') {
      return shift.crewChiefs.length
    }
    
    return shift.workers[type]?.length || 0
  }
  
  // Calculate position and width for a shift in the timeline with improved dimensions
  const calculateShiftPosition = (shift: TimelineShift) => {
    const [startHour, endHour] = visibleHoursRange
    const totalHours = endHour - startHour
    const timelineWidth = timelineRef.current?.clientWidth || 1200
    
    // Find which visible date this shift belongs to
    const dateIndex = visibleDates.findIndex(date => isSameDay(date, shift.date))
    if (dateIndex === -1) return { left: 0, width: 0, display: 'none' }
    
    // Calculate position based on time
    const shiftStartHour = shift.startTime.getHours() + (shift.startTime.getMinutes() / 60)
    const shiftEndHour = shift.endTime.getHours() + (shift.endTime.getMinutes() / 60)
    
    // Clamp to visible hours
    const visibleStartHour = Math.max(shiftStartHour, startHour)
    const visibleEndHour = Math.min(shiftEndHour, endHour)
    
    // Calculate position and width with improved sizing
    const dayWidth = timelineWidth / visibleDates.length
    const hourWidth = dayWidth / totalHours
    
    const left = (dateIndex * dayWidth) + ((visibleStartHour - startHour) * hourWidth)
    let width = (visibleEndHour - visibleStartHour) * hourWidth
    
    // Ensure minimum width for readability (at least 200px for short shifts)
    const minWidth = Math.min(300, dayWidth * 0.4) // Minimum 300px or 40% of day width
    width = Math.max(width, minWidth)
    
    // Ensure maximum width doesn't exceed day boundaries (with some padding)
    const maxWidth = dayWidth * 0.95
    width = Math.min(width, maxWidth)
    
    return {
      left: `${left}px`,
      width: `${width}px`,
      display: width > 0 ? 'block' : 'none'
    }
  }
  
  // Calculate staffing completion percentage for a shift
  const calculateStaffingCompletion = (shift: TimelineShift): number => {
    const totalRequired = shift.requestedWorkers
    if (totalRequired === 0) return 100
    
    const totalAssigned = Object.values(shift.workers).flat().length + shift.crewChiefs.length
    return Math.min(100, Math.round((totalAssigned / totalRequired) * 100))
  }
  
  // Get all worker types present in the job
  const getAllWorkerTypes = () => {
    if (!shifts) return []
    
    const types = new Set<string>()
    
    shifts.forEach(shift => {
      if (shift.requiredCrewChiefs > 0) types.add('CC')
      if (shift.requiredStagehands > 0) types.add('SH')
      if (shift.requiredForkOperators > 0) types.add('FO')
      if (shift.requiredReachForkOperators > 0) types.add('RFO')
      if (shift.requiredRiggers > 0) types.add('RG')
      if (shift.requiredGeneralLaborers > 0) types.add('GL')
      
      // Also add any worker types that have assigned workers
      if (shift.workers) {
        Object.keys(shift.workers).forEach(type => types.add(type))
      }
    })
    
    return Array.from(types).sort()
  }
  
  // Calculate overall staffing statistics
  const calculateOverallStats = () => {
    if (!shifts || shifts.length === 0) {
      return {
        totalRequired: 0,
        totalAssigned: 0,
        percentComplete: 0,
        shiftsWithGaps: 0,
        fullyStaffedShifts: 0
      }
    }
    
    let totalRequired = 0
    let totalAssigned = 0
    let shiftsWithGaps = 0
    let fullyStaffedShifts = 0
    
    shifts.forEach(shift => {
      const required = shift.requestedWorkers
      const assigned = Object.values(shift.workers).flat().length + shift.crewChiefs.length
      
      totalRequired += required
      totalAssigned += assigned
      
      if (assigned < required) {
        shiftsWithGaps++
      } else if (assigned >= required) {
        fullyStaffedShifts++
      }
    })
    
    return {
      totalRequired,
      totalAssigned,
      percentComplete: totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 100,
      shiftsWithGaps,
      fullyStaffedShifts
    }
  }
  
  // Calculate worker type statistics
  const calculateWorkerTypeStats = () => {
    if (!shifts || shifts.length === 0) return {}
    
    const stats: Record<string, { required: number, assigned: number, percentComplete: number }> = {}
    
    // Initialize stats for all worker types
    getAllWorkerTypes().forEach(type => {
      stats[type] = { required: 0, assigned: 0, percentComplete: 0 }
    })
    
    // Calculate totals
    shifts.forEach(shift => {
      // Crew Chiefs
      stats['CC'].required += shift.requiredCrewChiefs
      stats['CC'].assigned += shift.crewChiefs.length
      
      // Other worker types
      if (shift.requiredStagehands > 0) {
        stats['SH'].required += shift.requiredStagehands
        stats['SH'].assigned += shift.workers['SH']?.length || 0
      }
      
      if (shift.requiredForkOperators > 0) {
        stats['FO'].required += shift.requiredForkOperators
        stats['FO'].assigned += shift.workers['FO']?.length || 0
      }
      
      if (shift.requiredReachForkOperators > 0) {
        stats['RFO'].required += shift.requiredReachForkOperators
        stats['RFO'].assigned += shift.workers['RFO']?.length || 0
      }
      
      if (shift.requiredRiggers > 0) {
        stats['RG'].required += shift.requiredRiggers
        stats['RG'].assigned += shift.workers['RG']?.length || 0
      }
      
      if (shift.requiredGeneralLaborers > 0) {
        stats['GL'].required += shift.requiredGeneralLaborers
        stats['GL'].assigned += shift.workers['GL']?.length || 0
      }
    })
    
    // Calculate percentages
    Object.keys(stats).forEach(type => {
      const { required, assigned } = stats[type]
      stats[type].percentComplete = required > 0 ? Math.round((assigned / required) * 100) : 100
    })
    
    return stats
  }
  
  // Handle shift click to open assignment panel
  const handleShiftClick = (shiftId: string) => {
    setSelectedShift(selectedShift === shiftId ? null : shiftId)
    // In a real implementation, you might want to open a modal or side panel for assignments
  }
  
  // Enhanced export functionality with multiple formats
  const exportStaffingReport = (exportFormat: 'json' | 'csv' | 'pdf' = 'json') => {
    if (!shifts || !jobData) return
    
    const overallStats = calculateOverallStats()
    const typeStats = calculateWorkerTypeStats()
    const visibleShifts = getVisibleShifts()
    
    const reportData = {
      jobName: jobData.name,
      company: jobData.company.name,
      dateGenerated: new Date().toISOString(),
      reportType: meetingMode ? 'Meeting Report' : 'Full Staffing Report',
      filters: {
        searchQuery,
        filterByStatus,
        filterByDepartment,
        filterByLocation,
        filterWorkerType,
        showUnderfilledOnly,
        showCompletedShifts
      },
      overallStats,
      typeStats,
      shifts: visibleShifts.map(shift => ({
        id: shift.id,
        date: format(shift.date, 'yyyy-MM-dd'),
        timeRange: `${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}`,
        department: shift.department || 'N/A',
        location: shift.location || 'N/A',
        description: shift.description || 'N/A',
        status: shift.status,
        required: shift.requestedWorkers,
        assigned: Object.values(shift.workers).flat().length + shift.crewChiefs.length,
        gap: shift.requestedWorkers - (Object.values(shift.workers).flat().length + shift.crewChiefs.length),
        percentComplete: calculateStaffingCompletion(shift),
        workerBreakdown: Object.entries(WORKER_TYPES).map(([type, info]) => ({
          type,
          label: info.label,
          required: getRequiredCountForType(shift, type),
          assigned: getAssignedCountForType(shift, type),
          gap: Math.max(0, getRequiredCountForType(shift, type) - getAssignedCountForType(shift, type))
        })).filter(item => item.required > 0),
        assignedWorkers: [
          ...shift.crewChiefs.map(chief => ({
            name: chief.name,
            role: 'Crew Chief',
            status: chief.status
          })),
          ...Object.entries(shift.workers).flatMap(([type, workers]) =>
            workers.map(worker => ({
              name: worker.name,
              role: WORKER_TYPES[type]?.label || type,
              status: worker.status
            }))
          )
        ]
      }))
    }
    
    const fileName = `staffing-report-${jobData.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`
    
    switch (exportFormat) {
      case 'json':
        exportAsJSON(reportData, fileName)
        break
      case 'csv':
        exportAsCSV(reportData, fileName)
        break
      case 'pdf':
        exportAsPDF(reportData, fileName)
        break
    }
  }
  
  const exportAsJSON = (data: any, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadFile(blob, `${fileName}.json`)
  }
  
  const exportAsCSV = (data: any, fileName: string) => {
    const csvRows = []
    
    // Header row
    csvRows.push([
      'Date', 'Time Range', 'Department', 'Location', 'Status', 
      'Required Workers', 'Assigned Workers', 'Gap', 'Completion %',
      'Crew Chiefs Req', 'Crew Chiefs Assigned',
      'Stagehands Req', 'Stagehands Assigned',
      'Fork Operators Req', 'Fork Operators Assigned',
      'Riggers Req', 'Riggers Assigned',
      'General Laborers Req', 'General Laborers Assigned'
    ].join(','))
    
    // Data rows
    data.shifts.forEach((shift: any) => {
      const ccBreakdown = shift.workerBreakdown.find((w: any) => w.type === 'CC') || { required: 0, assigned: 0 }
      const shBreakdown = shift.workerBreakdown.find((w: any) => w.type === 'SH') || { required: 0, assigned: 0 }
      const foBreakdown = shift.workerBreakdown.find((w: any) => w.type === 'FO') || { required: 0, assigned: 0 }
      const rgBreakdown = shift.workerBreakdown.find((w: any) => w.type === 'RG') || { required: 0, assigned: 0 }
      const glBreakdown = shift.workerBreakdown.find((w: any) => w.type === 'GL') || { required: 0, assigned: 0 }
      
      csvRows.push([
        shift.date,
        shift.timeRange,
        shift.department,
        shift.location,
        shift.status,
        shift.required,
        shift.assigned,
        shift.gap,
        shift.percentComplete,
        ccBreakdown.required,
        ccBreakdown.assigned,
        shBreakdown.required,
        shBreakdown.assigned,
        foBreakdown.required,
        foBreakdown.assigned,
        rgBreakdown.required,
        rgBreakdown.assigned,
        glBreakdown.required,
        glBreakdown.assigned
      ].join(','))
    })
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    downloadFile(blob, `${fileName}.csv`)
  }
  
  const exportAsPDF = (data: any, fileName: string) => {
    // For PDF export, we'll create a simple HTML report and use the browser's print functionality
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Staffing Report - ${data.jobName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .stat-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
          .shifts-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .shifts-table th, .shifts-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .shifts-table th { background-color: #f5f5f5; }
          .gap-high { background-color: #fee; }
          .gap-medium { background-color: #fff3cd; }
          .gap-none { background-color: #d4edda; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Staffing Report: ${data.jobName}</h1>
          <p><strong>Company:</strong> ${data.company}</p>
          <p><strong>Generated:</strong> ${format(new Date(data.dateGenerated), 'PPpp')}</p>
          <p><strong>Report Type:</strong> ${data.reportType}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Overall Progress</h3>
            <p><strong>${data.overallStats.percentComplete}%</strong> Complete</p>
            <p>${data.overallStats.totalAssigned} of ${data.overallStats.totalRequired} positions filled</p>
          </div>
          <div class="stat-card">
            <h3>Shifts Status</h3>
            <p><strong>${data.overallStats.fullyStaffedShifts}</strong> Fully Staffed</p>
            <p><strong>${data.overallStats.shiftsWithGaps}</strong> Need Workers</p>
          </div>
        </div>
        
        <table class="shifts-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Department</th>
              <th>Location</th>
              <th>Status</th>
              <th>Required</th>
              <th>Assigned</th>
              <th>Gap</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${data.shifts.map((shift: any) => 
              `<tr class="${shift.gap > 5 ? 'gap-high' : shift.gap > 0 ? 'gap-medium' : 'gap-none'}">
                <td>${shift.date}</td>
                <td>${shift.timeRange}</td>
                <td>${shift.department}</td>
                <td>${shift.location}</td>
                <td>${shift.status}</td>
                <td>${shift.required}</td>
                <td>${shift.assigned}</td>
                <td>${shift.gap}</td>
                <td>${shift.percentComplete}%</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }
  
  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading scheduling timeline...</p>
        </div>
      </div>
    )
  }
  
  if (error || !jobData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h3 className="text-lg font-semibold">Failed to load scheduling data</h3>
          <p className="text-sm text-muted-foreground">{error || 'Job data not available'}</p>
        </div>
      </div>
    )
  }
  
  const visibleShifts = shifts ? getVisibleShifts() : []
  const workerTypes = shifts ? getAllWorkerTypes() : []
  const overallStats = shifts ? calculateOverallStats() : { totalRequired: 0, totalAssigned: 0, percentComplete: 0, fullyStaffedShifts: 0, shiftsWithGaps: 0 }
  const workerTypeStats = shifts ? calculateWorkerTypeStats() : {}
  

  
  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Job Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {jobData.company.logo ? (
                <div className="h-16 w-16 rounded-lg overflow-hidden shadow-md">
                  <img 
                    src={jobData.company.logo} 
                    alt={jobData.company.name} 
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shadow-md">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl font-bold">{jobData.name}</CardTitle>
                  {meetingMode && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Meeting Mode
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-3 text-base mt-1">
                  <span className="font-medium">{jobData.company.name}</span>
                  {jobData.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {jobData.location}
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${STATUS_COLORS[jobData.status] || 'bg-gray-500'} text-white`}>
                  {jobData.status}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {format(jobData.startDate, 'MMM d')} - {format(jobData.endDate, 'MMM d, yyyy')}
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => fetchJobData(true)}
                        disabled={refreshing}
                        className="gap-1"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={meetingMode ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setMeetingMode(!meetingMode)}
                        className="gap-1"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Meeting
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle meeting mode for focused discussions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={autoRefresh ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className="gap-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Auto
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto-refresh every 30 seconds</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Enhanced Staffing Progress Overview */}
      {showAssignmentStats && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Staffing Progress
                  {meetingMode && (
                    <Badge variant="outline" className="text-xs">
                      Focus Mode
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Overall staffing completion: {overallStats.totalAssigned} of {overallStats.totalRequired} positions filled ({overallStats.percentComplete}%)
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Enhanced Export Dialog */}
                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-4 w-4" />
                      Export Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Export Staffing Report</DialogTitle>
                      <DialogDescription>
                        Choose the format and options for your staffing report export.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="export-format">Export Format</Label>
                        <Select value={exportFormat} onValueChange={(value: 'json' | 'csv' | 'pdf') => setExportFormat(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                JSON - Detailed data
                              </div>
                            </SelectItem>
                            <SelectItem value="csv">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                CSV - Spreadsheet format
                              </div>
                            </SelectItem>
                            <SelectItem value="pdf">
                              <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4" />
                                PDF - Print-ready report
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Report Options</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="include-filters"
                              checked={true}
                              readOnly
                              className="rounded"
                            />
                            <Label htmlFor="include-filters" className="text-sm">
                              Include current filters and view settings
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="meeting-format"
                              checked={meetingMode}
                              onChange={(e) => setMeetingMode(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="meeting-format" className="text-sm">
                              Meeting-focused format (highlights gaps)
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        exportStaffingReport(exportFormat)
                        setExportDialogOpen(false)
                      }}>
                        Export {exportFormat.toUpperCase()}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Quick Export Buttons */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => exportStaffingReport('csv')}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quick CSV export</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Completion</span>
                  <span className="font-medium">{overallStats.percentComplete}%</span>
                </div>
                <Progress value={overallStats.percentComplete} className="h-2" />
                
                <div className="grid grid-cols-4 gap-6 pt-4">
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border">
                    <span className="text-sm font-semibold text-muted-foreground mb-1">Total Shifts</span>
                    <span className="text-3xl font-bold text-slate-700">{shifts.length}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <span className="text-sm font-semibold text-green-700 mb-1">Fully Staffed</span>
                    <span className="text-3xl font-bold text-green-600">{overallStats.fullyStaffedShifts}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                    <span className="text-sm font-semibold text-amber-700 mb-1">Need Workers</span>
                    <span className="text-3xl font-bold text-amber-600">{overallStats.shiftsWithGaps}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <span className="text-sm font-semibold text-blue-700 mb-1">Workers Needed</span>
                    <span className="text-3xl font-bold text-blue-600">{overallStats.totalRequired - overallStats.totalAssigned}</span>
                  </div>
                </div>
              </div>
              
              {/* Worker type breakdown */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Worker Type Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(workerTypeStats).map(([type, stats]) => (
                    <div key={type} className={`p-3 rounded-md border ${WORKER_TYPES[type]?.border || 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1.5 ${WORKER_TYPES[type]?.text || 'text-gray-800'}`}>
                          {WORKER_TYPES[type]?.icon}
                          <span className="font-medium">{WORKER_TYPES[type]?.label || type}</span>
                        </div>
                        <Badge variant="outline" className={stats.percentComplete === 100 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {stats.percentComplete}%
                        </Badge>
                      </div>
                      <Progress value={stats.percentComplete} className={`h-1.5 ${stats.percentComplete === 100 ? 'bg-green-100' : 'bg-amber-100'}`} />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Assigned: {stats.assigned}</span>
                        <span>Required: {stats.required}</span>
                        <span>Gap: {Math.max(0, stats.required - stats.assigned)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced Timeline Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduling Timeline
                  {visibleShifts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {visibleShifts.length} shifts
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Interactive visualization of shifts and staffing needs
                </CardDescription>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md">
                  <Button 
                    variant={viewMode === 'timeline' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode('timeline')}
                  >
                    Timeline
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                  <Button 
                    variant={viewMode === 'grid' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Search and Filter Bar */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts, workers, departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              
              {/* Advanced Filters */}
              <div className="flex items-center gap-3">
                {/* Date Navigation */}
                <div className="flex items-center gap-1 border rounded-lg shadow-sm">
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={goToPreviousDates}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <div className="text-base font-semibold px-4 min-w-[160px] text-center">
                    {format(visibleDates[0], 'MMM d')} - {format(visibleDates[visibleDates.length - 1], 'MMM d')}
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={goToNextDates}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center border rounded-lg shadow-sm">
                  <Button 
                    variant={zoomLevel === 1 ? "default" : "ghost"} 
                    size="sm" 
                    className="h-10 px-4 font-medium"
                    onClick={() => changeZoomLevel(1)}
                  >
                    Day
                  </Button>
                  <Button 
                    variant={zoomLevel === 2 ? "default" : "ghost"} 
                    size="sm" 
                    className="h-10 px-4 font-medium"
                    onClick={() => changeZoomLevel(2)}
                  >
                    3 Days
                  </Button>
                  <Button 
                    variant={zoomLevel === 3 ? "default" : "ghost"} 
                    size="sm" 
                    className="h-10 px-4 font-medium"
                    onClick={() => changeZoomLevel(3)}
                  >
                    Week
                  </Button>
                </div>
                
                {/* Status Filter */}
                <Select value={filterByStatus || 'all'} onValueChange={(value) => setFilterByStatus(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-[160px] h-10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {getUniqueStatuses().filter(status => status && status.trim() !== '').map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Department Filter */}
                <Select value={filterByDepartment || 'all'} onValueChange={(value) => setFilterByDepartment(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-[180px] h-10">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {getUniqueDepartments().filter(dept => dept && dept.trim() !== '').map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Location Filter */}
                <Select value={filterByLocation || 'all'} onValueChange={(value) => setFilterByLocation(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-[160px] h-10">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {getUniqueLocations().filter(location => location && location.trim() !== '').map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Worker Type Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-10 px-4">
                      <Filter className="h-4 w-4" />
                      {filterWorkerType ? WORKER_TYPES[filterWorkerType]?.label : 'All Types'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    <div className="space-y-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setFilterWorkerType(null)}
                      >
                        All Worker Types
                      </Button>
                      
                      {workerTypes.map(type => (
                        <Button 
                          key={type}
                          variant="ghost" 
                          size="sm" 
                          className={`w-full justify-start ${filterWorkerType === type ? 'bg-muted' : ''}`}
                          onClick={() => setFilterWorkerType(type)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-2 ${WORKER_TYPES[type]?.bg || 'bg-gray-200'}`}></div>
                          {WORKER_TYPES[type]?.label || type}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Quick Filter Toggles */}
                <Button 
                  variant={showUnderfilledOnly ? "default" : "outline"} 
                  size="sm"
                  className="gap-2 h-10 px-4"
                  onClick={() => setShowUnderfilledOnly(!showUnderfilledOnly)}
                >
                  <AlertCircle className="h-4 w-4" />
                  {showUnderfilledOnly ? 'Gaps Only' : 'Show Gaps'}
                </Button>
                
                <Button 
                  variant={highlightCriticalGaps ? "default" : "outline"} 
                  size="sm"
                  className="gap-2 h-10 px-4"
                  onClick={() => setHighlightCriticalGaps(!highlightCriticalGaps)}
                >
                  <TrendingUp className="h-4 w-4" />
                  Critical
                </Button>
                
                {/* Settings Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-10 px-4">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="space-y-3">
                      <h4 className="font-medium">View Settings</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-completed" className="text-sm">Show Completed</Label>
                          <input
                            id="show-completed"
                            type="checkbox"
                            checked={showCompletedShifts}
                            onChange={(e) => setShowCompletedShifts(e.target.checked)}
                            className="rounded"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="compact-view" className="text-sm">Compact View</Label>
                          <input
                            id="compact-view"
                            type="checkbox"
                            checked={compactView}
                            onChange={(e) => setCompactView(e.target.checked)}
                            className="rounded"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-stats" className="text-sm">Show Statistics</Label>
                          <input
                            id="show-stats"
                            type="checkbox"
                            checked={showAssignmentStats}
                            onChange={(e) => setShowAssignmentStats(e.target.checked)}
                            className="rounded"
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Time Range</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={visibleHoursRange[0]}
                            onChange={(e) => setVisibleHoursRange([parseInt(e.target.value), visibleHoursRange[1]])}
                            className="w-16 h-8"
                          />
                          <span className="text-sm">to</span>
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            value={visibleHoursRange[1]}
                            onChange={(e) => setVisibleHoursRange([visibleHoursRange[0], parseInt(e.target.value)])}
                            className="w-16 h-8"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <>
              {/* Timeline Header - Hours */}
              <div className="relative border-b mb-1">
                <div className="flex">
                  {visibleDates.map((date, dateIndex) => (
                    <div 
                      key={dateIndex} 
                      className="flex-1 border-r last:border-r-0"
                    >
                      <div className="font-medium text-sm py-1 px-2 bg-muted/50">
                        {format(date, 'EEE, MMM d')}
                        {isToday(date) && (
                          <Badge variant="default" className="ml-2 text-xs">Today</Badge>
                        )}
                      </div>
                      
                      <div className="flex">
                        {Array.from({ length: Math.ceil((visibleHoursRange[1] - visibleHoursRange[0]) / 4) }).map((_, quarterIndex) => {
                          const hour = visibleHoursRange[0] + (quarterIndex * 4)
                          if (hour >= visibleHoursRange[1]) return null
                          return (
                            <div 
                              key={quarterIndex} 
                              className="flex-1 text-sm font-medium text-center py-2 border-r last:border-r-0 text-slate-700 bg-slate-50/50"
                              style={{ minWidth: '80px' }}
                            >
                              {hour % 12 === 0 ? '12' : hour % 12}:00{hour < 12 ? 'am' : 'pm'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Staffing Level Legend */}
          {viewMode === 'timeline' && (
            <div className="mb-4 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Staffing Level Color Guide:</h4>
                <div className="text-xs text-slate-500">Click any shift to expand details</div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${STAFFING_COLORS.complete.accent} shadow-sm`}></div>
                  <span className="text-xs font-medium text-slate-600">100% Staffed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${STAFFING_COLORS.good.accent} shadow-sm`}></div>
                  <span className="text-xs font-medium text-slate-600">80-99% Staffed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${STAFFING_COLORS.warning.accent} shadow-sm`}></div>
                  <span className="text-xs font-medium text-slate-600">50-79% Staffed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${STAFFING_COLORS.critical.accent} shadow-sm`}></div>
                  <span className="text-xs font-medium text-slate-600">Under 50% Staffed</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Timeline Content */}
          {viewMode === 'timeline' && (
            <div className="relative min-h-[800px] bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl border-2 border-slate-200/50 shadow-2xl shadow-slate-200/20 backdrop-blur-sm p-8" ref={timelineRef}>
              
              {/* Main Timeline Line - positioned in the middle */}
              <div className="absolute left-6 right-6 bg-slate-400 shadow-lg rounded-full" style={{ 
                top: '50%', 
                height: '3px', 
                transform: 'translateY(-1.5px)' 
              }}>
                {/* Time markers on the timeline */}
                {visibleDates.map((date, dateIndex) => (
                  <div key={dateIndex}>
                    {Array.from({ length: Math.ceil((visibleHoursRange[1] - visibleHoursRange[0]) / 4) }).map((_, quarterIndex) => {
                      const hour = visibleHoursRange[0] + (quarterIndex * 4)
                      if (hour >= visibleHoursRange[1]) return null
                      const position = (dateIndex * 100 / visibleDates.length) + (quarterIndex * 100 / visibleDates.length / Math.ceil((visibleHoursRange[1] - visibleHoursRange[0]) / 4))
                      
                      return (
                        <div 
                          key={quarterIndex} 
                          className="absolute w-3 h-3 bg-slate-500 rounded-full border-2 border-white shadow-md"
                          style={{ 
                            left: `${position}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          {/* Time label */}
                          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-slate-600 whitespace-nowrap bg-white/80 px-2 py-1 rounded shadow-sm">
                            {hour % 12 === 0 ? '12' : hour % 12}:00{hour < 12 ? 'am' : 'pm'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            
            {/* Enhanced Current time indicator */}
            {visibleDates.some(date => isToday(date)) && (
              <div 
                className="absolute w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-3 border-white shadow-xl shadow-red-500/40 animate-pulse z-30"
                style={{
                  left: (() => {
                    const now = new Date()
                    const todayIndex = visibleDates.findIndex(date => isToday(date))
                    if (todayIndex === -1) return '0%'
                    
                    const currentHour = now.getHours() + (now.getMinutes() / 60)
                    if (currentHour < visibleHoursRange[0] || currentHour > visibleHoursRange[1]) return '0%'
                    
                    const dayWidth = 100 / visibleDates.length
                    const totalHours = visibleHoursRange[1] - visibleHoursRange[0]
                    const hourWidth = dayWidth / totalHours
                    
                    return `${(todayIndex * dayWidth) + ((currentHour - visibleHoursRange[0]) * hourWidth)}%`
                  })(),
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Current time label */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-600 whitespace-nowrap bg-red-50 px-2 py-1 rounded shadow-md border border-red-200">
                  NOW
                </div>
              </div>
            )}
            
            {/* Enhanced Shifts Rendering with Timeline Connections */}
            {visibleShifts.map((shift, index) => {
              const staffingCompletion = calculateStaffingCompletion(shift)
              const isFullyStaffed = staffingCompletion >= 100
              const isUnderStaffed = staffingCompletion < 100
              const totalGap = shift.requestedWorkers - (Object.values(shift.workers).flat().length + shift.crewChiefs.length)
              const isCriticalGap = totalGap > 3
              const isHighPriority = meetingMode && highlightCriticalGaps && isCriticalGap
              const staffingStyle = getStaffingLevelStyle(staffingCompletion, totalGap)
              const isExpanded = selectedShift === shift.id
              
              // Calculate timeline position for the shift
              const dateIndex = visibleDates.findIndex(date => isSameDay(date, shift.date))
              if (dateIndex === -1) return null
              
              const shiftStartHour = shift.startTime.getHours() + (shift.startTime.getMinutes() / 60)
              const shiftEndHour = shift.endTime.getHours() + (shift.endTime.getMinutes() / 60)
              const shiftMidHour = (shiftStartHour + shiftEndHour) / 2
              
              const dayWidth = 100 / visibleDates.length
              const totalHours = visibleHoursRange[1] - visibleHoursRange[0]
              const hourWidth = dayWidth / totalHours
              
              const timelinePosition = (dateIndex * dayWidth) + ((shiftMidHour - visibleHoursRange[0]) * hourWidth)
              
              // Alternate shifts above and below the timeline
              const isAbove = index % 2 === 0
              const verticalDistance = 60 + (Math.floor(index / 2) * 40) // Much more compact staggering
              
              const shiftTop = isAbove ? `calc(50% - ${verticalDistance}px)` : `calc(50% + ${verticalDistance}px)`
              
              return (
                <React.Fragment key={shift.id}>
                  {/* Connecting Line from Timeline to Shift */}
                  <div 
                    className={`absolute w-0.5 ${staffingStyle.accent} shadow-sm z-10`}
                    style={{
                      left: `${timelinePosition}%`,
                      top: '50%',
                      height: `${verticalDistance - 10}px`,
                      transform: isAbove ? 'translateY(-100%)' : 'translateY(2px)'
                    }}
                  />
                  
                  {/* Timeline Connection Point */}
                  <div 
                    className={`absolute w-3 h-3 ${staffingStyle.accent} rounded-full border-2 border-white shadow-md z-20`}
                    style={{
                      left: `${timelinePosition}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                  
                  {/* Shift Card - Much Smaller for Desktop */}
                  <div 
                    className={`absolute rounded-lg border-2 overflow-hidden transition-all duration-300 cursor-pointer backdrop-blur-sm ${staffingStyle.shadow} ${
                      isExpanded 
                        ? `ring-2 ${staffingStyle.ring} ring-opacity-60 shadow-xl z-30 scale-110` 
                        : 'hover:shadow-lg hover:scale-105 z-10'
                    } ${staffingStyle.border} ${staffingStyle.bg} ${
                      meetingMode && isHighPriority ? 'animate-pulse' : ''
                    }`}
                    style={{
                      left: `${Math.max(2, Math.min(80, timelinePosition - 10))}%`, // Keep cards within bounds
                      top: shiftTop,
                      width: isExpanded ? '400px' : '240px',
                      height: isExpanded ? 'auto' : '48px',
                      minHeight: isExpanded ? '320px' : '48px'
                    }}
                    onClick={() => handleShiftClick(shift.id)}
                  >
                  {/* Collapsed View - Desktop Optimized */}
                  {!isExpanded && (
                    <div className={`h-full flex items-center px-4 py-2 ${STATUS_COLORS[shift.status] || STATUS_COLORS['Scheduled']} relative text-sm`}>
                      {/* Priority Indicator */}
                      {isHighPriority && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                          <AlertCircle className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      
                      {/* Staffing Level Indicator */}
                      <div className={`absolute -top-1 -left-1 w-4 h-4 ${staffingStyle.accent} rounded-full border-2 border-white flex items-center justify-center`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="text-white font-bold text-sm truncate">
                            {shift.department || 'Shift'}
                          </div>
                          <div className="text-white/90 text-sm font-medium whitespace-nowrap">
                            {format(shift.startTime, 'h:mm a')} - {format(shift.endTime, 'h:mm a')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Staffing indicator */}
                          <div className="text-white text-sm font-bold bg-black/50 px-2 py-1 rounded-md">
                            {Object.values(shift.workers).flat().length + shift.crewChiefs.length}/{shift.requestedWorkers}
                          </div>
                          
                          {/* Gap indicator */}
                          {totalGap > 0 && (
                            <div className={`text-sm px-2 py-1 rounded-md font-bold ${
                              isCriticalGap 
                                ? 'bg-red-600 text-white' 
                                : 'bg-amber-600 text-white'
                            }`}>
                              -{totalGap}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Expanded View */}
                  {isExpanded && (
                    <>
                      {/* Enhanced Shift Header - Compact Desktop Version */}
                      <div className={`p-3 ${STATUS_COLORS[shift.status] || STATUS_COLORS['Scheduled']} relative shadow-md`}>
                        {/* Priority Indicator */}
                        {isHighPriority && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce z-10">
                            <AlertCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                        
                        {/* Staffing Level Indicator */}
                        <div className={`absolute -top-1.5 -left-1.5 w-4 h-4 ${staffingStyle.accent} rounded-full border-2 border-white shadow-md flex items-center justify-center`}>
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        
                        {/* Collapse indicator */}
                        <div className="absolute -top-1 right-1 text-white/70 text-xs bg-black/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-black/50">
                          ▲
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-bold text-sm flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-white rounded-full opacity-90 shadow-sm"></div>
                            {shift.department || 'Shift'}
                          </div>
                          <div className="text-white text-xs font-bold bg-black/30 px-2 py-1 rounded shadow-sm">
                            {format(shift.startTime, 'h:mm a')} - {format(shift.endTime, 'h:mm a')}
                          </div>
                        </div>
                        
                        {shift.location && (
                          <div className="text-white/95 text-xs font-medium flex items-center gap-1.5 mb-2 bg-black/20 px-2 py-1 rounded">
                            <MapPin className="h-3 w-3" />
                            <span>{shift.location}</span>
                          </div>
                        )}
                    
                    {/* Enhanced Staffing Progress - Compact */}
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                      <div className="flex items-center justify-between text-xs text-white mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="p-0.5 bg-white/20 rounded-full">
                            <Users className="h-3 w-3" />
                          </div>
                          <span className="font-bold">Staffing: {staffingCompletion}%</span>
                          {totalGap > 0 && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 font-bold shadow-md border ${
                                isCriticalGap 
                                  ? 'bg-red-500 text-white border-red-300' 
                                  : 'bg-amber-500 text-white border-amber-300'
                              }`}
                            >
                              -{totalGap}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm">
                            {Object.values(shift.workers).flat().length + shift.crewChiefs.length}
                          </span>
                          <span className="text-white/70 text-xs">/{shift.requestedWorkers}</span>
                        </div>
                      </div>
                      <Progress 
                        value={staffingCompletion} 
                        className="h-2 bg-white/20 rounded-full shadow-inner" 
                        indicatorClassName={`transition-all duration-500 rounded-full shadow-sm ${
                          staffingCompletion >= 100
                            ? "bg-gradient-to-r from-green-400 to-emerald-500" 
                            : staffingCompletion >= 80
                              ? "bg-gradient-to-r from-emerald-400 to-green-500"
                              : staffingCompletion >= 50
                                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                : "bg-gradient-to-r from-red-400 to-rose-500"
                        }`}
                      />
                      
                      {/* Meeting Mode: Quick Action Buttons */}
                      {meetingMode && (
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 text-white hover:bg-white/30 rounded-full transition-all duration-200 hover:scale-110"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Add to focused problems list
                                    if (!focusedProblems.includes(shift.id)) {
                                      setFocusedProblems([...focusedProblems, shift.id])
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Focus on this shift</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 text-white hover:bg-white/30 rounded-full transition-all duration-200 hover:scale-110"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Quick assign action
                                    window.location.href = `/shifts/${shift.id}/assign`
                                  }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Quick assign workers</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Worker Type Breakdown - Compact */}
                  <div className="bg-gradient-to-b from-slate-50/90 to-white/90 backdrop-blur-sm p-2 max-h-[200px] overflow-y-auto border-t border-slate-200/50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {/* Crew Chiefs Section */}
                    {shift.requiredCrewChiefs > 0 && (
                      <div className={`mb-2 p-2 rounded-md shadow-sm border ${WORKER_TYPES['CC'].bg} ${WORKER_TYPES['CC'].text} ${WORKER_TYPES['CC'].border} backdrop-blur-sm`}>
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-white/20 rounded-full">
                              {WORKER_TYPES['CC'].icon}
                            </div>
                            <span>Crew Chiefs</span>
                          </div>
                          <Badge 
                            variant={shift.crewChiefs.length >= shift.requiredCrewChiefs ? "default" : "destructive"}
                            className={`text-xs px-2 py-1 font-bold shadow-md border rounded ${
                              shift.crewChiefs.length >= shift.requiredCrewChiefs 
                                ? 'bg-green-500 hover:bg-green-600 border-green-400' 
                                : 'bg-red-500 hover:bg-red-600 border-red-400'
                            }`}
                          >
                            {shift.crewChiefs.length}/{shift.requiredCrewChiefs}
                          </Badge>
                        </div>
                        
                        {/* Assigned Crew Chiefs */}
                        {shift.crewChiefs.length > 0 ? (
                          <div className="space-y-2">
                            {shift.crewChiefs.map((chief, idx) => (
                              <div key={chief.id} className="flex items-center gap-4 text-sm bg-white/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/60 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                                <Avatar className="h-10 w-10 ring-3 ring-white shadow-xl">
                                  <AvatarImage src={chief.avatar} />
                                  <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-inner">
                                    {chief.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 font-bold text-gray-900">{chief.name}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-3 py-1.5 font-bold shadow-lg border-2 rounded-full`}
                                  style={{
                                    backgroundColor: WORKER_STATUS_COLORS[chief.status] ? `${WORKER_STATUS_COLORS[chief.status]}20` : '#f3f4f6',
                                    borderColor: WORKER_STATUS_COLORS[chief.status] || '#d1d5db',
                                    color: WORKER_STATUS_COLORS[chief.status] || '#6b7280'
                                  }}
                                >
                                  {chief.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-gradient-to-br from-red-50 to-red-100 backdrop-blur-sm rounded-xl border-2 border-red-300 shadow-xl">
                            <div className="p-3 bg-red-500 rounded-full w-fit mx-auto mb-3 shadow-lg">
                              <AlertCircle className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-red-800 font-bold text-base block mb-1">No Crew Chief Assigned</span>
                            <p className="text-red-700 text-sm">This shift requires a crew chief</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Other Worker Types */}
                    {Object.entries(WORKER_TYPES).filter(([type]) => type !== 'CC').map(([type, info]) => {
                      const required = getRequiredCountForType(shift, type)
                      const assigned = getAssignedCountForType(shift, type)
                      const assignedWorkers = shift.workers[type] || []
                      
                      if (required === 0) return null
                      
                      return (
                        <div key={type} className={`mb-3 p-3 rounded-lg shadow-md border-2 ${info.bg} ${info.text} ${info.border} ${info.shadow} backdrop-blur-sm`}>
                          <div className="flex items-center justify-between text-sm font-bold mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-white/20 rounded-full">
                                {info.icon}
                              </div>
                              <span>{info.label}</span>
                            </div>
                            <Badge 
                              variant={assigned >= required ? "default" : "destructive"}
                              className={`text-sm px-4 py-2 font-bold shadow-xl border-2 rounded-full ${
                                assigned >= required 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400 shadow-green-500/30' 
                                  : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-red-400 shadow-red-500/30'
                              }`}
                            >
                              {assigned}/{required}
                            </Badge>
                          </div>
                          
                          {/* Assigned Workers */}
                          {assignedWorkers.length > 0 ? (
                            <div className="space-y-2">
                              {assignedWorkers.map((worker, idx) => (
                                <div key={worker.id} className="flex items-center gap-3 text-sm bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/50">
                                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-md">
                                    <AvatarImage src={worker.avatar} />
                                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-green-500 to-blue-600 text-white">
                                      {worker.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 font-semibold text-gray-800">{worker.name}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs px-2 py-1 font-medium shadow-sm ${
                                      WORKER_STATUS_COLORS[worker.status] ? `border-2` : 'bg-gray-100 border-gray-300'
                                    }`}
                                    style={{
                                      backgroundColor: WORKER_STATUS_COLORS[worker.status] ? `${WORKER_STATUS_COLORS[worker.status]}15` : undefined,
                                      borderColor: WORKER_STATUS_COLORS[worker.status] ? `${WORKER_STATUS_COLORS[worker.status]}` : undefined,
                                      color: WORKER_STATUS_COLORS[worker.status] ? `${WORKER_STATUS_COLORS[worker.status]}` : undefined
                                    }}
                                  >
                                    {worker.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-red-50/80 backdrop-blur-sm rounded-lg border-2 border-red-200 shadow-sm">
                              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                              <span className="text-red-700 font-bold text-sm">No {info.label} Assigned</span>
                              <p className="text-red-600 text-xs mt-1">This position needs to be filled</p>
                            </div>
                          )}
                          
                          {/* Show remaining slots needed */}
                          {assigned < required && (
                            <div className="mt-2 text-center py-3 bg-amber-50/80 backdrop-blur-sm rounded-lg border-2 border-amber-300 shadow-sm">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <UserPlus className="h-5 w-5 text-amber-600" />
                                <span className="text-amber-800 font-bold text-sm">
                                  Need {required - assigned} more {info.label}{required - assigned > 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-amber-700 text-xs">Click to assign workers</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Enhanced Quick Assignment Actions */}
                    {!compactView && (
                      <div className="mt-4 pt-3 border-t-2 border-gray-300">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-9 px-4 text-sm flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg font-semibold"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/shifts/${shift.id}/assign`
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Workers
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-4 text-sm flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/shifts/${shift.id}`
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Shift
                          </Button>
                        </div>
                      </div>
                    </>
                    )}
                  </div>
                </div>
              )
            })}
            
            {/* Enhanced Empty state */}
            {visibleShifts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {showUnderfilledOnly ? "No Staffing Gaps Found" : "No Shifts Scheduled"}
                </h3>
                <p className="text-gray-500 max-w-md">
                  {showUnderfilledOnly 
                    ? "All shifts for the selected dates are fully staffed. Great job!" 
                    : "There are no shifts scheduled for the selected date range. Try adjusting your filters or date selection."}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setShowUnderfilledOnly(false)
                    setFilterByStatus(null)
                    setFilterByDepartment(null)
                    setFilterByLocation(null)
                    setSearchQuery('')
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
          )}
          
          {/* List View - Desktop Optimized */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {visibleShifts.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-lg">
                  {showUnderfilledOnly 
                    ? "No shifts with staffing gaps for the selected dates" 
                    : "No shifts scheduled for the selected dates"}
                </div>
              ) : (
                visibleShifts.map((shift) => {
                  const staffingCompletion = calculateStaffingCompletion(shift)
                  const totalGap = shift.requestedWorkers - (Object.values(shift.workers).flat().length + shift.crewChiefs.length)
                  const isCriticalGap = totalGap > 3
                  const isHighPriority = meetingMode && highlightCriticalGaps && isCriticalGap
                  
                  return (
                    <Card 
                      key={shift.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${
                        selectedShift === shift.id ? 'ring-2 ring-primary shadow-lg' : ''
                      } ${
                        isHighPriority ? 'border-red-500 shadow-red-100' : ''
                      }`}
                      onClick={() => handleShiftClick(shift.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[shift.status] || 'bg-gray-500'} shadow-md`}></div>
                            <div>
                              <h4 className="font-bold text-lg">{shift.department || 'Shift'}</h4>
                              <p className="text-base text-muted-foreground font-medium">
                                {format(shift.date, 'EEEE, MMM d')} • {format(shift.startTime, 'h:mm a')} - {format(shift.endTime, 'h:mm a')}
                                {shift.location && ` • ${shift.location}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {isHighPriority && (
                              <Badge variant="destructive" className="text-sm px-3 py-1">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Critical
                              </Badge>
                            )}
                            <Badge variant={staffingCompletion >= 100 ? "default" : "secondary"} className="text-sm px-3 py-1">
                              {staffingCompletion}% Staffed
                            </Badge>
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              {Object.values(shift.workers).flat().length + shift.crewChiefs.length}/{shift.requestedWorkers} Workers
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Progress value={staffingCompletion} className="h-2" />
                          
                          {/* Detailed Worker Assignments */}
                          <div className="space-y-2">
                            {/* Crew Chiefs */}
                            {shift.requiredCrewChiefs > 0 && (
                              <div className="border rounded-lg p-2 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1 text-sm font-medium">
                                    {WORKER_TYPES['CC'].icon}
                                    <span>Crew Chiefs</span>
                                  </div>
                                  <Badge variant={shift.crewChiefs.length >= shift.requiredCrewChiefs ? "default" : "destructive"} className="text-xs">
                                    {shift.crewChiefs.length}/{shift.requiredCrewChiefs}
                                  </Badge>
                                </div>
                                
                                {shift.crewChiefs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {shift.crewChiefs.map(chief => (
                                      <div key={chief.id} className="flex items-center gap-1 bg-white rounded px-2 py-1 text-xs">
                                        <Avatar className="h-4 w-4">
                                          <AvatarImage src={chief.avatar} />
                                          <AvatarFallback className="text-xs">
                                            {chief.name.split(' ').map(n => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{chief.name}</span>
                                        <div className={`w-2 h-2 rounded-full ${WORKER_STATUS_COLORS[chief.status] || 'bg-gray-400'}`}></div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                    No Crew Chief assigned
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Other Worker Types */}
                            {Object.entries(WORKER_TYPES).filter(([type]) => type !== 'CC').map(([type, info]) => {
                              const required = getRequiredCountForType(shift, type)
                              const assigned = getAssignedCountForType(shift, type)
                              const assignedWorkers = shift.workers[type] || []
                              
                              if (required === 0) return null
                              
                              return (
                                <div key={type} className="border rounded-lg p-2 bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1 text-sm font-medium">
                                      {info.icon}
                                      <span>{info.label}</span>
                                    </div>
                                    <Badge variant={assigned >= required ? "default" : "destructive"} className="text-xs">
                                      {assigned}/{required}
                                    </Badge>
                                  </div>
                                  
                                  {assignedWorkers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {assignedWorkers.map(worker => (
                                        <div key={worker.id} className="flex items-center gap-1 bg-white rounded px-2 py-1 text-xs">
                                          <Avatar className="h-4 w-4">
                                            <AvatarImage src={worker.avatar} />
                                            <AvatarFallback className="text-xs">
                                              {worker.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="font-medium">{worker.name}</span>
                                          <div className={`w-2 h-2 rounded-full ${WORKER_STATUS_COLORS[worker.status] || 'bg-gray-400'}`}></div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                      No {info.label} assigned
                                    </div>
                                  )}
                                  
                                  {assigned < required && (
                                    <div className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                                      Need {required - assigned} more {info.label}{required - assigned > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Overall Gap Indicator */}
                          {totalGap > 0 && (
                            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                              isCriticalGap ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">
                                {isCriticalGap ? 'CRITICAL: ' : ''}Need {totalGap} more worker{totalGap > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
          
          {/* Grid View - Desktop Optimized */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-4 gap-6">
              {visibleShifts.length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-[300px] text-muted-foreground text-lg">
                  {showUnderfilledOnly 
                    ? "No shifts with staffing gaps for the selected dates" 
                    : "No shifts scheduled for the selected dates"}
                </div>
              ) : (
                visibleShifts.map((shift) => {
                  const staffingCompletion = calculateStaffingCompletion(shift)
                  const totalGap = shift.requestedWorkers - (Object.values(shift.workers).flat().length + shift.crewChiefs.length)
                  const isCriticalGap = totalGap > 3
                  const isHighPriority = meetingMode && highlightCriticalGaps && isCriticalGap
                  
                  return (
                    <Card 
                      key={shift.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                        selectedShift === shift.id ? 'ring-2 ring-primary shadow-lg' : ''
                      } ${
                        isHighPriority ? 'border-red-500 shadow-red-100' : ''
                      } h-56`}
                      onClick={() => handleShiftClick(shift.id)}
                    >
                      <CardContent className="p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[shift.status] || 'bg-gray-500'} shadow-sm`}></div>
                          {isHighPriority && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-1 truncate">{shift.department || 'Shift'}</h4>
                          <p className="text-sm text-muted-foreground mb-3 font-medium">
                            {format(shift.date, 'MMM d')} • {format(shift.startTime, 'h:mm a')} - {format(shift.endTime, 'h:mm a')}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Staffed</span>
                              <span className={`font-bold ${staffingCompletion >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                {staffingCompletion}%
                              </span>
                            </div>
                            <Progress value={staffingCompletion} className="h-2" />
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Workers</span>
                              <span className="font-bold">{Object.values(shift.workers).flat().length + shift.crewChiefs.length}/{shift.requestedWorkers}</span>
                            </div>
                            
                            {shift.location && (
                              <div className="text-xs text-muted-foreground truncate">
                                📍 {shift.location}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {totalGap > 0 && (
                          <div className={`text-sm px-3 py-2 rounded-md mt-3 font-medium ${
                            isCriticalGap ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            Need {totalGap} more worker{totalGap > 1 ? 's' : ''}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
          
          {/* Legend - Desktop Optimized */}
          <div className="mt-8 border-t pt-6">
            <h4 className="text-lg font-bold mb-4">Worker Type Legend</h4>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(WORKER_TYPES).map(([type, colors]) => (
                <div 
                  key={type}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${colors.bg} ${colors.text} ${colors.border} border shadow-sm`}
                >
                  <div className={`w-2 h-2 rounded-full ${colors.bg} border ${colors.border}`}></div>
                  {colors.label}
                </div>
              ))}
              
              <div className="border-l mx-1 h-6"></div>
              
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-300">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                Needs Workers
              </div>
              
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                Fully Staffed
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="border-t pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {viewMode === 'timeline' 
                  ? "Click on a shift to see detailed worker assignments" 
                  : `Showing ${visibleShifts.length} shift${visibleShifts.length !== 1 ? 's' : ''}`}
              </div>
              
              {/* Meeting Mode: Focused Problems */}
              {meetingMode && focusedProblems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {focusedProblems.length} focused
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFocusedProblems([])}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Auto-refresh indicator */}
              {autoRefresh && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Auto-refresh
                </div>
              )}
              
              {/* Meeting Mode: Quick Actions */}
              {meetingMode && (
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowUnderfilledOnly(!showUnderfilledOnly)}
                    className="gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {showUnderfilledOnly ? 'Show All' : 'Problems Only'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportStaffingReport('pdf')}
                    className="gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    Print Report
                  </Button>
                </div>
              )}
              
              {/* Navigation Actions */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = `/jobs/${jobId}/shifts`}
                        className="gap-1"
                      >
                        <CalendarDays className="h-3 w-3" />
                        All Shifts
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View detailed shift management</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = `/jobs/${jobId}/workers`}
                        className="gap-1"
                      >
                        <Users className="h-3 w-3" />
                        Workers
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage worker assignments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
