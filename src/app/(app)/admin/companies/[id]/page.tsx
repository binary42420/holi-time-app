"use client"

import React from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useCompany } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserRole } from "@prisma/client"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { Building, Mail, Phone, MapPin, Edit } from "lucide-react"

function CompanyDetailsPage() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const { data: companyData, isLoading: loading, error } = useCompany(companyId)

  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2">Loading company details...</p>
        </div>
      </div>
    )
  }

  if (error || !companyData) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-red-500">Error loading company details: {error?.toString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CompanyAvatar src={companyData.company_logo_url} name={companyData.name} className="w-16 h-16 text-2xl" />
          <div>
            <h1 className="text-3xl font-bold text-white">{companyData.name}</h1>
            <Badge variant="secondary" className="mt-1">Company</Badge>
          </div>
        </div>
        <Button onClick={() => router.push(`/admin/companies/${companyId}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Company
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400">Company Name</label>
              <p className="text-white">{companyData.name}</p>
            </div>
            {companyData.address && (
              <div>
                <label className="text-sm font-medium text-gray-400 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Address
                </label>
                <p className="text-white">{companyData.address}</p>
              </div>
            )}
            {companyData.email && (
              <div>
                <label className="text-sm font-medium text-gray-400 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <p className="text-white">{companyData.email}</p>
              </div>
            )}
            {companyData.phone && (
              <div>
                <label className="text-sm font-medium text-gray-400 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <p className="text-white">{companyData.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyData.email && (
              <div>
                <label className="text-sm font-medium text-gray-400">Email</label>
                <p className="text-white">{companyData.email}</p>
              </div>
            )}
            {companyData.phone && (
              <div>
                <label className="text-sm font-medium text-gray-400">Phone</label>
                <p className="text-white">{companyData.phone}</p>
              </div>
            )}
            {companyData.address && (
              <div>
                <label className="text-sm font-medium text-gray-400">Address</label>
                <p className="text-white">{companyData.address}</p>
              </div>
            )}
            {companyData.website && (
              <div>
                <label className="text-sm font-medium text-gray-400">Website</label>
                <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                  {companyData.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CompanyDetailsPage;