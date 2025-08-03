"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useUsers } from "@/hooks/use-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/Header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import { Plus, Mail, Search, Filter, AlertCircle, RefreshCw, MoreVertical, Building } from "lucide-react"
import { UserRole } from "@prisma/client"

export default function ClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const canManage = user?.role === 'Admin'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading, isError, error, refetch } = useUsers({
    page,
    role: 'CompanyUser', // Only show CompanyUsers
    search: searchTerm || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const users = data?.users || []
  const pagination = data?.pagination

  const handleRowClick = (userId: string) => {
    router.push(`/clients/${userId}`)
  }

  const handleAddClient = () => {
    router.push('/clients/new')
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPage(1)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.CompanyUser:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Clients</h1>
                <p className="text-gray-400">Loading client data...</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full bg-gray-700" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4 bg-gray-700" />
                        <Skeleton className="h-3 w-1/2 bg-gray-700" />
                      </div>
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
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                Error loading clients: {error?.message || 'Unknown error'}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => refetch()} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Clients</h1>
              <p className="text-gray-400">
                {pagination?.totalUsers || 0} clients found
              </p>
            </div>
            {canManage && (
              <Button 
                onClick={handleAddClient}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((client) => (
              <Card 
                key={client.id} 
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => handleRowClick(client.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={client.avatarUrl || undefined} alt={client.name} />
                        <AvatarFallback className="bg-gray-700 text-gray-300">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{client.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleBadgeColor(client.role)}>
                            {client.role === UserRole.CompanyUser ? 'Client' : client.role}
                          </Badge>
                          <Badge className={getStatusBadgeColor(client.isActive)}>
                            {client.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-400">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.company && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Building className="w-4 h-4 mr-2" />
                        <span className="truncate">{client.company.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {users.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No clients found</h3>
                <p className="text-gray-400 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by adding your first client.'
                  }
                </p>
                {canManage && (
                  <Button onClick={handleAddClient} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Previous
              </Button>
              <span className="text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
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