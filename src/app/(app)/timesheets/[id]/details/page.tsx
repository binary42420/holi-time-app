"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Eye, FileText, CheckCircle } from 'lucide-react'
import { TimesheetDetails } from '@/components/timesheet-details'

export default function TimesheetDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [timesheet, setTimesheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimesheet()
  }, [id])

  const fetchTimesheet = async () => {
    try {
      const response = await fetch(`/api/timesheets/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTimesheet(data)
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!timesheet) return <div>Timesheet not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Timesheet Details</h1>
        </div>
        <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-4 w-4 mr-1" />
          {timesheet.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {/* Download options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Options
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {timesheet.unsigned_pdf_url && (
            <div className="space-y-2">
              <h4 className="font-medium">Unsigned Version</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={timesheet.unsigned_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={timesheet.unsigned_pdf_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}

          {timesheet.signed_pdf_url && (
            <div className="space-y-2">
              <h4 className="font-medium">Signed Version</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={timesheet.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={timesheet.signed_pdf_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval history */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timesheet.submittedAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Submitted on {new Date(timesheet.submittedAt).toLocaleString()}</span>
              </div>
            )}
            
            {timesheet.company_approved_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Client approved on {new Date(timesheet.company_approved_at).toLocaleString()}</span>
                {timesheet.company_notes && (
                  <span className="text-gray-500 italic">- {timesheet.company_notes}</span>
                )}
              </div>
            )}
            
            {timesheet.manager_approved_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Final approval on {new Date(timesheet.manager_approved_at).toLocaleString()}</span>
                {timesheet.manager_notes && (
                  <span className="text-gray-500 italic">- {timesheet.manager_notes}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}