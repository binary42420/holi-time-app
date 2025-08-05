"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useJobs, useCompanies } from "@/hooks/use-api"
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Briefcase, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser } from "@/hooks/use-user"
import Header from "@/components/Header"

interface JobEditPageProps {
  params: { id: string }
}

export default function JobEditPage({ params }: JobEditPageProps) {
  const { id } = params
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: jobs, isLoading: jobLoading, isError: jobError, refetch: refetchJob } = useJobs()
  const { data: companiesData, isLoading: companiesLoading, isError: companiesError, refetch: refetchCompanies } = useCompanies()
  const companies = companiesData?.companies || []

  const job = jobs?.find(j => j.id === id)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    companyId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && user.role !== UserRole.Admin) {
      router.push('/jobs')
    }
  }, [user, router])

  useEffect(() => {
    if (job) {
      setFormData({
        name: job.name || '',
        description: job.description || '',
        companyId: job.companyId || ''
      })
    }
  }, [job])

  const loading = jobLoading || companiesLoading;
  const error = jobError || companiesError;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3 bg-gray-700" />
            <Skeleton className="h-96 w-full bg-gray-800" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !job) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                Error loading job data: {error?.toString()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { refetchJob(); refetchCompanies(); }}
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
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Job name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.companyId) {
      toast({
        title: "Validation Error", 
        description: "Company selection is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update job')
      }

      // Invalidate and refetch job data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      
      toast({ 
        title: "Job Updated Successfully", 
        description: `"${formData.name}" has been updated and saved.` 
      })
      router.push(`/jobs/${id}`)
    } catch (error) {
      console.error('Job update error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update job",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${id}`)} className="text-gray-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job
            </Button>
          </div>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Briefcase className="h-5 w-5" /> Edit Job</CardTitle>
              <CardDescription>Update the job details below for client: <span className="font-semibold text-indigo-400">{job.company.name}</span></CardDescription>
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
                    disabled={isSubmitting}
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-gray-300">Client *</Label>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                    required
                    disabled={true}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
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
                    disabled={isSubmitting}
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                    {isSubmitting ? 'Updating...' : 'Update Job'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push(`/jobs/${id}`)} className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    Cancel
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
