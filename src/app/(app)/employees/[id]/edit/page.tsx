"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useUserById } from "@/hooks/use-api"
import { useQueryClient } from '@tanstack/react-query'
import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserRole } from "@prisma/client"
import { ArrowLeft, User, Mail, MapPin, Award, Settings } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-states"

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const id = params.id as string
  const { data: employeeData, isLoading, error } = useUserById(id)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.Employee,
    location: '',
    phone: '',
    certifications: '',
    crew_chief_eligible: false,
    fork_operator_eligible: false,
    performance: 0
  })

  // Load employee data when available
  useEffect(() => {
    if (employeeData) {
      setFormData({
        name: employeeData.name || '',
        email: employeeData.email || '',
        role: employeeData.role || UserRole.Employee,
        location: employeeData.location || '',
        phone: employeeData.phone || '',
        certifications: Array.isArray(employeeData.certifications) 
          ? employeeData.certifications.join(', ')
          : employeeData.certifications || '',
        crew_chief_eligible: employeeData.crew_chief_eligible || false,
        fork_operator_eligible: employeeData.fork_operator_eligible || false,
        performance: employeeData.performance || 0
      })
    }
  }, [employeeData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'performance' ? parseFloat(value) || 0 : value 
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Employee name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error", 
        description: "Employee email is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let uploadedAvatarUrl = employeeData?.avatarUrl

      // Upload avatar if new file selected
      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append('avatar', avatarFile)

        const uploadResponse = await fetch(`/api/users/${id}/avatar`, {
          method: 'POST',
          body: avatarFormData,
        })

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json()
          uploadedAvatarUrl = url
        } else {
          throw new Error('Failed to upload avatar')
        }
      }

      // Prepare data for API
      const updateData = {
        ...formData,
        avatarUrl: uploadedAvatarUrl,
        certifications: formData.certifications
          .split(',')
          .map(cert => cert.trim())
          .filter(cert => cert.length > 0)
      }

      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update employee')
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      
      toast({
        title: "Success",
        description: "Employee information has been updated successfully.",
      })

      // Redirect to employee detail page
      router.push(`/employees/${id}`)

    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update employee",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Header>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-[60vh]">
            <LoadingSpinner />
            <span className="ml-2">Loading employee details...</span>
          </div>
        </div>
      </Header>
    )
  }

  if (error || !employeeData) {
    return (
      <Header>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Employee Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The employee you're looking for doesn't exist or you don't have permission to edit them.
                </p>
                <Button onClick={() => router.push('/employees')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Employees
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Header>
    )
  }

  return (
    <Header>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(`/employees/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employee
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Employee</h1>
            <p className="text-muted-foreground">{employeeData.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update the employee's basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarPreview || employeeData?.avatarUrl} />
                  <AvatarFallback>
                    {formData.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatar">Update Avatar</Label>
                  <Input 
                    id="avatar" 
                    type="file" 
                    onChange={handleAvatarChange} 
                    accept="image/*"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Role & Location */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange('role', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).filter(role => role !== UserRole.Admin).map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills & Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills & Qualifications
              </CardTitle>
              <CardDescription>
                Manage employee certifications and role eligibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Certifications */}
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Textarea
                  id="certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleInputChange}
                  placeholder="Enter certifications separated by commas (e.g., OSHA 30, Forklift License, First Aid)"
                  rows={3}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Separate multiple certifications with commas
                </p>
              </div>

              {/* Eligibility Switches */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="crew_chief_eligible">Crew Chief Eligible</Label>
                    <p className="text-sm text-muted-foreground">
                      Can be assigned as crew chief on shifts
                    </p>
                  </div>
                  <Switch
                    id="crew_chief_eligible"
                    checked={formData.crew_chief_eligible}
                    onCheckedChange={(checked) => handleSwitchChange('crew_chief_eligible', checked)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="fork_operator_eligible">Fork Operator Eligible</Label>
                    <p className="text-sm text-muted-foreground">
                      Qualified to operate forklifts
                    </p>
                  </div>
                  <Switch
                    id="fork_operator_eligible"
                    checked={formData.fork_operator_eligible}
                    onCheckedChange={(checked) => handleSwitchChange('fork_operator_eligible', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Performance Rating */}
              <div className="space-y-2">
                <Label htmlFor="performance">Performance Rating (0-10)</Label>
                <Input
                  id="performance"
                  name="performance"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.performance}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Rate employee performance from 0 to 10
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/employees/${id}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Settings className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Header>
  )
}