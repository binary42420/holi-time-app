"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useCompanies } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import CompanyCard from "@/components/CompanyCard"
import {
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UserRole } from "@prisma/client"

function AdminCompaniesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: companiesData, isLoading: loading, error } = useCompanies()
  const [searchTerm] = useState("")

  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const companies = companiesData?.companies || []
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (confirm(`Are you sure you want to delete ${companyName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/companies/${companyId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          toast({
            title: "Company Deleted",
            description: `${companyName} has been successfully deleted.`,
          })
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        } else {
          throw new Error('Failed to delete company')
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete company. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2">Loading companies...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-red-500">Error loading companies: {error.toString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Client Companies</h1>
        <Button onClick={() => router.push('/companies/new')}>
          Add New Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            onView={() => router.push(`/companies/${company.id}`)}
            onEdit={() => router.push(`/companies/${company.id}/edit`)}
            onDelete={(c) => handleDeleteCompany(c.id, c.name)}
          />
        ))}
      </div>
    </div>
  )
}

export default AdminCompaniesPage;
