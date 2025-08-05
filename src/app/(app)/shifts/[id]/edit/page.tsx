"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useShift, useUsers } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShiftUrl } from "@/lib/url-utils"
import { LoadingSpinner } from "@/components/loading-states"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WorkerRequirements from "@/components/worker-requirements"
import ShiftImportCSV from "@/components/shift-import-csv"
import type { RoleCode } from "@/lib/types"
import { useUser } from "@/hooks/use-user"

const shiftSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  requiredCrewChiefs: z.number().optional(),
  requiredStagehands: z.number().optional(),
  requiredForkOperators: z.number().optional(),
  requiredReachForkOperators: z.number().optional(),
  requiredRiggers: z.number().optional(),
  requiredGeneralLaborers: z.number().optional(),
})

type ShiftFormData = z.infer<typeof shiftSchema>

export default function EditShiftPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const shiftId = params.id as string

  const { data: shift, isLoading: shiftLoading, isError: shiftError } = useShift(shiftId)

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      notes: '',
      requiredCrewChiefs: 0,
      requiredStagehands: 0,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 0,
      requiredGeneralLaborers: 0,
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (shift && !shiftLoading) {
      console.log('Loading shift data for form:', {
        id: shift.id,
        location: shift.location,
        locationLength: shift.location?.length,
        locationType: typeof shift.location,
        fullShift: shift
      });

      const formData = {
        date: shift.date ? new Date(shift.date).toISOString().split('T')[0] : '',
        startTime: shift.startTime ? new Date(shift.startTime).toTimeString().slice(0, 5) : '',
        endTime: shift.endTime ? new Date(shift.endTime).toTimeString().slice(0, 5) : '',
        location: shift.location || '',
        description: shift.description || '',
        notes: shift.notes || '',
        requiredCrewChiefs: (shift as any).requiredCrewChiefs || 0,
        requiredStagehands: (shift as any).requiredStagehands || 0,
        requiredForkOperators: (shift as any).requiredForkOperators || 0,
        requiredReachForkOperators: (shift as any).requiredReachForkOperators || 0,
        requiredRiggers: (shift as any).requiredRiggers || 0,
        requiredGeneralLaborers: (shift as any).requiredGeneralLaborers || 0,
      };

      console.log('Setting form data:', formData);

      // Reset the form with the new data
      form.reset(formData);

      // Double-check that location is set correctly
      setTimeout(() => {
        const currentLocation = form.getValues('location');
        console.log('Form location after reset:', currentLocation);
        if (!currentLocation && shift.location) {
          console.log('Location not set correctly, forcing update...');
          form.setValue('location', shift.location, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: false
          });
        }
      }, 100);
    }
  }, [shift, shiftLoading, form])

  const onSubmit = async (data: ShiftFormData) => {
    if (!shiftId) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update shift')
      }

      toast({
        title: "Shift Updated Successfully",
        description: `Shift details for ${shift.job?.name} on ${new Date(shift.date).toLocaleDateString()} have been saved.`,
      })

      if (shiftId) {
        router.push(generateShiftUrl(shiftId))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (shiftLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (shiftError || !shift) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Shift Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The shift you're looking for doesn't exist or you don't have permission to edit it.
              </p>
              <Button onClick={() => {
                // Navigate to admin/shifts for admins, otherwise to regular shifts page
                const shiftsPath = user?.role === 'Admin' ? '/admin/shifts' : '/shifts';
                router.push(shiftsPath);
              }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shifts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(generateShiftUrl(shiftId))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shift
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Shift</h1>
            <p className="text-muted-foreground">
              {shift.job?.company?.name} • {shift.job?.name} • {new Date(shift.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div><strong>Shift Location:</strong> {shift?.location || 'null'}</div>
              <div><strong>Form Location:</strong> {form.watch('location') || 'empty'}</div>
              <div><strong>Form Errors:</strong> {Object.keys(form.formState.errors).length > 0 ? Object.keys(form.formState.errors).join(', ') : 'None'}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
            <CardDescription>
              Update the basic information for this shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="Enter shift location"
                  {...form.register("location")}
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worker Requirements & Assignment</CardTitle>
            <CardDescription>
              Manage worker requirements manually or import from CSV data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="requirements" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="requirements">Worker Requirements</TabsTrigger>
                <TabsTrigger value="import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requirements" className="mt-6">
                <WorkerRequirements
                  shiftId={shiftId}
                  onUpdate={(updatedRequirements) => {
                    // Handle successful update without page refresh
                    console.log('Worker requirements updated:', updatedRequirements);
                    // The component handles its own state updates
                  }}
                />
              </TabsContent>

              <TabsContent value="import" className="mt-6">
                <ShiftImportCSV
                  shiftId={shiftId}
                  onImportComplete={(result) => {
                    toast({
                      title: "Import Successful",
                      description: `Imported ${result.workersProcessed} workers and updated requirements automatically.`
                    });
                    // Note: Components handle their own state updates
                    console.log('Import completed:', result);
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work to be performed"
                {...form.register("description")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments"
                {...form.register("notes")}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(generateShiftUrl(shiftId))}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
