"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useUsers } from "@/hooks/use-api"
import { useEnhancedPerformance } from "@/hooks/use-enhanced-performance"
import { useHoverPrefetch } from "@/hooks/use-intelligent-prefetch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar } from "@/components/Avatar"
import { getInitials } from "@/lib/utils"
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  Mail,
  MapPin,
  Star,
  Shield,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Crown,
  Truck,
  HardHat
} from "lucide-react"
import { UserRole } from "@prisma/client"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  crew_chief_eligible?: boolean;
  fork_operator_eligible?: boolean;
  OSHA_10_Certifications?: boolean;
  location?: string;
  certifications?: string[];
  performance?: number;
  isActive?: boolean;
}

export default function EmployeesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [mounted, setMounted] = useState(false)
  
  // Performance optimizations
  const { smartPrefetch, prefetchForPage } = useEnhancedPerformance()
  const { cancelHover } = useHoverPrefetch()

  // Prefetch employees page data on mount
  useEffect(() => {
    if (user) {
      smartPrefetch('/employees');
    }
  }, [user, smartPrefetch]);

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading, isError, error, refetch } = useUsers({
    page,
    role: roleFilter === 'all' ? undefined : roleFilter,
    search: searchTerm || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    excludeCompanyUsers: true, // Exclude CompanyUsers from employees page
  });
  
  const users = data?.users || []
  const pagination = data?.pagination

  // All filtering is now handled server-side
  const filteredUsers = users;

  const canManage = user?.role === 'Admin' || user?.role === 'CrewChief'

  const getRoleBadge = (role: UserRole) => {
    const roleStyles: Record<UserRole, string> = {
      'Admin': 'bg-purple-600 text-white',
      'CrewChief': 'bg-blue-600 text-white',
      'Employee': 'bg-green-600 text-white',
      'CompanyUser': 'bg-orange-600 text-white',
      'Staff': 'bg-gray-600 text-white',
    }

    return (
      <Badge 
        variant="default"
        className={roleStyles[role] || 'bg-gray-600 text-white'}
      >
        {role}
      </Badge>
    )
  }

  const getEligibilityBadges = (user: User) => {
    const badges = []
    if (user.crew_chief_eligible) {
      badges.push(
        <Badge key="cc" variant="outline" className="text-blue-400 border-blue-400 flex items-center gap-1" title="Crew Chief Eligible">
          <Crown className="h-3 w-3" />
          CC
        </Badge>
      )
    }
    if (user.fork_operator_eligible) {
      badges.push(
        <Badge key="fo" variant="outline" className="text-green-400 border-green-400 flex items-center gap-1" title="Fork Operator Eligible">
          <Truck className="h-3 w-3" />
          FO
        </Badge>
      )
    }
    if (user.OSHA_10_Certifications) {
      badges.push(
        <Badge key="osha" variant="outline" className="text-orange-400 border-orange-400 flex items-center gap-1" title="OSHA 10 Certified">
          <HardHat className="h-3 w-3" />
          OSHA
        </Badge>
      )
    }
    return badges
  }

  const getPerformanceStars = (performance?: number) => {
    if (!performance) return null
    const stars = Math.round(performance)
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < stars ? 'text-yellow-400 fill-current' : 'text-gray-600'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-400">{performance.toFixed(1)}</span>
      </div>
    )
  }

  const handleUserAction = async (action: string, userId: string, userName: string) => {
    try {
      switch (action) {
        case 'view':
          prefetchForPage(`/employees/${userId}`)
          router.push(`/employees/${userId}`)
          break
        case 'edit':
          prefetchForPage(`/admin/employees/${userId}/edit`)
          router.push(`/admin/employees/${userId}/edit`)
          break
        case 'delete':
          if (confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
            const response = await fetch(`/api/users/${userId}`, {
              method: 'DELETE',
            })
            
            if (response.ok) {
              toast({
                title: "User Deleted",
                description: `${userName} has been successfully deleted.`,
              })
              await refetch()
            } else {
              throw new Error('Failed to delete user')
            }
          }
          break
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEmployeeHover = (userId: string) => {
    // Prefetch employee details on hover
    prefetchForPage(`/employees/${userId}`)
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Employees</h1>
                <p className="text-gray-400">Loading employee data...</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-full bg-gray-700" />
                    <Skeleton className="h-4 w-3/4 bg-gray-700" />
                    <Skeleton className="h-4 w-1/2 bg-gray-700" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16 bg-gray-700" />
                      <Skeleton className="h-5 w-20 bg-gray-700" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Alert className="max-w-md bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  Error loading employees: {error?.message || 'Unknown error'}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="mt-2 w-full border-red-700 text-red-200 hover:bg-red-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Employees</h1>
              <p className="text-gray-400">
                {filteredUsers.length} employee{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {canManage && (
              <Button 
                onClick={() => router.push('/employees/new')} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setRoleFilter("all")
                    setStatusFilter("all")
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Role</label>
                  <Select value={roleFilter} onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="CrewChief">Crew Chief</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="CompanyUser">Company User</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees Grid */}
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No employees found</h3>
              <p className="text-gray-500 text-center max-w-md">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? "Try adjusting your filters to see more employees."
                  : "No employees have been added yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((employee: User) => (
                <Card
                  key={employee.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                  onMouseEnter={() => handleEmployeeHover(employee.id)}
                  onMouseLeave={cancelHover}
                  onClick={() => handleUserAction('view', employee.id, employee.name)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="hover:opacity-80 transition-opacity">
                            <Avatar
                              src={employee.avatarUrl}
                              name={employee.name || employee.email || 'U'}
                              userId={employee.id}
                              size="xl"
                              enableSmartCaching={true}
                              className="h-20 w-20"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{employee.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {getRoleBadge(employee.role)}
                              {employee.isActive !== false ? (
                                <Badge variant="outline" className="text-green-400 border-green-400">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-400 border-red-400">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-700">
                              <DropdownMenuItem 
                                onClick={() => handleUserAction('view', employee.id, employee.name)}
                                className="text-gray-300 hover:bg-gray-700"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUserAction('edit', employee.id, employee.name)}
                                className="text-gray-300 hover:bg-gray-700"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUserAction('delete', employee.id, employee.name)}
                                className="text-red-400 hover:bg-red-900/20"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        
                        {employee.location && (
                          <div className="flex items-center text-sm text-gray-300">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{employee.location}</span>
                          </div>
                        )}

                        {employee.performance && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Shield className="h-4 w-4 mr-2 text-gray-400" />
                            {getPerformanceStars(employee.performance)}
                          </div>
                        )}

                        {/* Eligibility badges */}
                        <div className="flex items-center gap-2">
                          {getEligibilityBadges(employee)}
                        </div>

                        {/* Certifications */}
                        {employee.certifications && employee.certifications.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {employee.certifications.slice(0, 3).map((cert, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                {cert}
                              </Badge>
                            ))}
                            {employee.certifications.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                +{employee.certifications.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}