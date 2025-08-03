"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useUser } from "@/hooks/use-user"
import { useCompanies } from "@/hooks/use-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import Header from "@/components/Header"

import { Plus, Mail, Phone, Building, AlertCircle, RefreshCw, Users, Briefcase, MapPin } from "lucide-react"

export default function CompaniesPage() {
  const { user } = useUser()
  const router = useRouter()
  const canManage = user?.role === 'Admin'
  const { data, isLoading: loading, error, refetch } = useCompanies()
  const companies = data?.companies || []
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const filteredCompanies = useMemo(() => {
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [companies, searchTerm])

  const handleRowClick = (companyId: string) => {
    router.push(`/companies/${companyId}`)
  }

  if (!mounted || loading) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Companies</h1>
                <p className="text-gray-400">Loading company data...</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-full bg-gray-700" />
                    <Skeleton className="h-4 w-3/4 bg-gray-700" />
                    <Skeleton className="h-4 w-1/2 bg-gray-700" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Alert className="max-w-md bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  Error loading companies: {error.toString()}
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Companies</h1>
              <p className="text-gray-400">
                {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'} found
              </p>
            </div>
            {canManage && (
              <Button onClick={() => router.push('/companies/new')} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                New Company
              </Button>
            )}
          </div>

          <Input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />

          {filteredCompanies.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No companies found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Get started by adding your first company.
                </p>
                 {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push('/companies/new')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company: any) => (
                <Card
                  key={company.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(company.id)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-white truncate">{company.name}</h3>
                        {company.company_logo_url && (
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                              src={company.company_logo_url}
                              alt={`${company.name} logo`}
                              fill
                              sizes="48px"
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {company.email && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{company.email}</span>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{company.phone}</span>
                          </div>
                        )}
                        {company.address && (
                          <div className="flex items-center text-sm text-gray-300">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{company.address}</span>
                          </div>
                        )}
                        {company._count?.users !== undefined && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{company._count.users} Users</span>
                          </div>
                        )}
                        {company._count?.jobs !== undefined && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{company._count.jobs} Jobs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
