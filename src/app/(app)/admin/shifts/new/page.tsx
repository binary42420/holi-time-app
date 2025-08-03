"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUser } from "@/hooks/use-user"
import { useJobs, useUsers } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShiftUrl } from "@/lib/url-utils"
import WorkerTypeSelector from "@/components/worker-type-selector"
import { UserRole } from '@prisma/client';
import { withAuth } from "@/lib/withAuth";

const shiftSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  requestedWorkers: z.number().min(1, "At least 1 worker is required"),
  crewChiefId: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  requirements: z.string().optional(),
  notes: z.string().optional(),
  workerRequirements: z.array(z.object({
    roleCode: z.string(),
    roleName: z.string(),
    count: z.number(),
    color: z.string()
  })).optional(),
})

type ShiftFormData = z.infer<typeof shiftSchema>

function NewShiftPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: jobs = [] } = useJobs()
  const { data: usersResponse } = useUsers({ fetchAll: true })
  const users = usersResponse?.users || []

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      requestedWorkers: 1,
      workerRequirements: [],
    },
  })

  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const handleWorkerRequirementsChange = (requirements: any[], totalCount: number) => {
    form.setValue('requestedWorkers', totalCount)
    form.setValue('workerRequirements', requirements)
  }

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create shift')
      }

      const result = await response.json()
      
      toast({
        title: "Shift Scheduled",
        description: "The shift has been scheduled successfully.",
      })

      router.push(generateShiftUrl(result.shift.id))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const crewChiefs = users?.filter(user =>
    user.role === 'CrewChief' || user.role === 'Admin'
  ) || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/shifts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shifts
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Schedule New Shift</h1>
          <p className="text-muted-foreground">Create a new work shift</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shift Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobId">Job</Label>
                <Select onValueChange={(value) => form.setValue('jobId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.name} ({job.company.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crewChiefId">Crew Chief (Optional)</Label>
                <Select onValueChange={(value) => form.setValue('crewChiefId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crew chief" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewChiefs.map(chief => (
                      <SelectItem key={chief.id} value={chief.id}>
                        {chief.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" {...form.register("startTime")} />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" {...form.register("endTime")} />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea id="requirements" {...form.register("requirements")} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>
          </CardContent>
        </Card>

        <WorkerTypeSelector onChange={handleWorkerRequirementsChange} />

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/shifts')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Scheduling...' : 'Schedule Shift'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default withAuth(NewShiftPage, 'Admin');
