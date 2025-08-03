"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Staff'
  })

  const id = params.id as string

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update employee')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Employee information has been updated successfully.",
      })

      // Redirect to employee page
      router.push(`/employees`)

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

  return (
    <Header>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Employee</CardTitle>
            <CardDescription>Update employee information</CardDescription>            
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Employee'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Header>
  )
}