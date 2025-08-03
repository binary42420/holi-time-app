"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'

import { Input } from '@mantine/core'
import { 
  ArrowLeft, 
  Plus, 
  Search,
  Copy,
  Edit,
  Trash2,
  FileText,
  Clock,
  Users,
  MapPin
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock data for shift templates
const mockTemplates = [
  {
    id: "1",
    name: "Morning Warehouse Shift",
    description: "Standard morning warehouse operations",
    startTime: "08:00",
    endTime: "16:00",
    duration: "8 hours",
    requestedWorkers: 4,
    requirements: ["Forklift Certification", "Safety Training"],
    location: "Main Warehouse",
    usageCount: 25,
  },
  {
    id: "2", 
    name: "Construction Cleanup",
    description: "Post-construction site cleanup and organization",
    startTime: "07:00",
    endTime: "15:00",
    duration: "8 hours",
    requestedWorkers: 6,
    requirements: ["Construction Experience", "Safety Certification"],
    location: "Construction Sites",
    usageCount: 12,
  },
  {
    id: "3",
    name: "Event Setup - Evening",
    description: "Evening event setup and preparation",
    startTime: "14:00",
    endTime: "20:00",
    duration: "6 hours",
    requestedWorkers: 3,
    requirements: ["Event Experience", "Customer Service"],
    location: "Event Venues",
    usageCount: 18,
  },
  {
    id: "4",
    name: "Night Security Patrol",
    description: "Overnight security and facility monitoring",
    startTime: "22:00",
    endTime: "06:00",
    duration: "8 hours",
    requestedWorkers: 2,
    requirements: ["Security License", "Night Shift Experience"],
    location: "Various Facilities",
    usageCount: 8,
  },
]

import { UserRole } from '@prisma/client';
import { withAuth } from "@/lib/withAuth";

function ShiftTemplatesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const filteredTemplates = mockTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUseTemplate = (template: any) => {
    // Navigate to new shift page with template data pre-filled
    const queryParams = new URLSearchParams({
      template: template.id,
      startTime: template.startTime,
      endTime: template.endTime,
      requestedWorkers: template.requestedWorkers.toString(),
      location: template.location,
      description: template.description,
      requirements: template.requirements.join(', '),
    })
    router.push(`/admin/shifts/new?${queryParams.toString()}`)
  }

  const handleEditTemplate = (templateId: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Template editing will be available in a future update.",
    })
  }

  const handleDeleteTemplate = (templateId: string) => {
    toast({
      title: "Feature Coming Soon", 
      description: "Template deletion will be available in a future update.",
    })
  }

  const getShiftTypeColor = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0])
    if (hour >= 6 && hour < 12) return 'default' // Morning
    if (hour >= 12 && hour < 18) return 'secondary' // Afternoon
    if (hour >= 18 && hour < 22) return 'outline' // Evening
    return 'destructive' // Night
  }

  const getShiftTypeLabel = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0])
    if (hour >= 6 && hour < 12) return 'Morning'
    if (hour >= 12 && hour < 18) return 'Afternoon'
    if (hour >= 18 && hour < 22) return 'Evening'
    return 'Night'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/shifts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shifts
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Shift Templates</h1>
          <p className="text-muted-foreground">Pre-configured shift templates for quick scheduling</p>
        </div>
        <Button onClick={() => toast({ title: "Feature Coming Soon", description: "Custom template creation will be available soon." })}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Templates
          </CardTitle>
          <CardDescription>
            Choose from pre-configured shift templates to quickly schedule new shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No templates match your search criteria.' : 'No shift templates available.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={getShiftTypeColor(template.startTime)} className="mt-1">
                          {getShiftTypeLabel(template.startTime)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used {template.usageCount} times
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{template.startTime} - {template.endTime} ({template.duration})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{template.requestedWorkers} workers needed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{template.location}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Requirements:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.requirements.map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(ShiftTemplatesPage, 'Admin');
