"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Plus,
  Search,
  Copy,
  Edit,
  Trash2,
  FileText,
  MapPin,
  Users
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { withAuth } from "@/lib/withAuth"
import { UserRole } from "@prisma/client"

// Mock data for job templates
const mockTemplates = [
  {
    id: "1",
    name: "Warehouse Loading",
    description: "Standard warehouse loading and unloading operations",
    category: "Warehouse",
    requiredWorkers: 4,
    duration: "8 hours",
    skills: ["Forklift Operation", "Heavy Lifting"],
    location: "Warehouse District",
    usageCount: 15,
  },
  {
    id: "2",
    name: "Construction Site Cleanup",
    description: "Post-construction cleanup and debris removal",
    category: "Construction",
    requiredWorkers: 6,
    duration: "10 hours",
    skills: ["Construction Experience", "Safety Certification"],
    location: "Various Construction Sites",
    usageCount: 8,
  },
  {
    id: "3",
    name: "Event Setup",
    description: "Event venue setup and breakdown",
    category: "Events",
    requiredWorkers: 3,
    duration: "6 hours",
    skills: ["Event Experience", "Customer Service"],
    location: "Event Venues",
    usageCount: 22,
  },
]

function JobTemplatesPage() {
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
    template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUseTemplate = (template: any) => {
    // Navigate to new job page with template data pre-filled
    const queryParams = new URLSearchParams({
      template: template.id,
      name: template.name,
      description: template.description,
      location: template.location,
    })
    router.push(`/jobs/new?${queryParams.toString()}`)
  }

  const handleEditTemplate = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Template editing will be available in a future update.",
    })
  }

  const handleDeleteTemplate = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Template deletion will be available in a future update.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/jobs')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
          <h1 className="text-3xl font-bold">Job Templates</h1>
          <p className="text-muted-foreground">Pre-configured job templates for quick job creation</p>
        </div>
        <Button
          onClick={() => toast({ title: "Feature Coming Soon", description: "Custom template creation will be available soon." })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>Choose from pre-configured job templates to quickly create new jobs</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full md:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Templates Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No templates match your search criteria.' : 'No job templates available.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <Badge>{template.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Used {template.usageCount} times</p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground mb-4">
                      {template.description}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{template.requiredWorkers} workers • {template.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{template.location}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={handleEditTemplate}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handleDeleteTemplate}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleUseTemplate(template)} className="flex-grow">
                      <Copy className="mr-2 h-4 w-4" />
                      Use Template
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(JobTemplatesPage, "Admin")
