'use client'

import React, { useState, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCompanies } from '@/hooks/use-api'
import { apiService } from '@/lib/services/api'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, AlertCircle, RefreshCw } from "lucide-react"

import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUser } from "@/hooks/use-user"
import Header from "@/components/Header"

function NewJobForm() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [companySearch, setCompanySearch] = useState('');

  const { 
    data: companiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: clientsLoading,
    isError: clientsError,
    refetch
  } = useInfiniteQuery({
    queryKey: ['companies', { search: companySearch }],
    queryFn: ({ pageParam = 1 }) => apiService.getCompanies({ page: pageParam, pageSize: 20, search: companySearch }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const allCompanies = useMemo(() => companiesData?.pages.flatMap(page => page.companies) ?? [], [companiesData]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    companyId: searchParams.get('companyId') || ''
  })

  if (user && user.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  if (clientsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3 bg-gray-700" />
            <Skeleton className="h-96 w-full bg-gray-800" />
          </div>
        </main>
      </div>
    )
  }

  if (clientsError) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                Error loading clients: {clientsError.toString()}
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
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create job')

      const result = await response.json()
      toast({ title: "Success", description: "Job created successfully" })
      router.push(`/jobs/${result.job.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create job",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Create New Job</CardTitle>
              <CardDescription>Enter the details for the new job.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Job Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter job name"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId" className="text-gray-300">Client *</Label>
                  <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })} required>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <div className="p-2">
                        <Input
                          placeholder="Search companies..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      {allCompanies.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                      {hasNextPage && (
                        <div className="p-2">
                          <Button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="w-full"
                          >
                            {isFetchingNextPage ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter job description"
                    rows={4}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting} className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formData.name.trim() || !formData.companyId} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Creating...' : 'Create Job'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewJobForm />
    </Suspense>
  )
}
