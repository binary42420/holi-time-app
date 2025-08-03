"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileSignature, Download, Eye } from 'lucide-react'
import SignatureCaptureModal from '@/components/signature-capture-modal'
import { TimesheetDetails } from '@/components/timesheet-details'
import { UserRole } from '@prisma/client'

export default function ClientApprovalPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  const [timesheet, setTimesheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const canApprove = () => {
    if (!user || !timesheet) return false
    
    const isAdmin = user.role === UserRole.Admin
    const isCompanyUser = user.role === UserRole.CompanyUser && user.companyId === timesheet.shift.job.companyId
    const isAssignedCrewChief = user.role === UserRole.CrewChief && timesheet.shift.crewChiefId === user.id
    
    return timesheet.status === 'pending_company_approval' && (isAdmin || isCompanyUser || isAssignedCrewChief)
  }

  const handleSignatureSubmit = async (signatureData: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          approvalType: 'client',
          notes: notes.trim() || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve timesheet')
      }

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: result.message
      })

      setShowSignatureModal(false)
      await fetchTimesheet()

    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve timesheet',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
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
          <h1 className="text-2xl font-bold">Client Timesheet Approval</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {timesheet.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unsigned Downloads */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Unsigned Timesheet</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${id}/excel?signed=false`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </a>
                </Button>
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${id}/pdf?signed=false`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>

            {/* Signed Downloads (if available) */}
            {timesheet.status !== 'pending_company_approval' && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Signed Timesheet</h4>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" asChild size="sm">
                    <a href={`/api/timesheets/${id}/excel?signed=true`} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download Signed Excel
                    </a>
                  </Button>
                  <Button variant="outline" asChild size="sm">
                    <a href={`/api/timesheets/${id}/pdf?signed=true`} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download Signed PDF
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client approval section */}
      {canApprove() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Client Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about this timesheet..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowSignatureModal(true)}
                disabled={submitting}
                size="lg"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Approve & Sign Timesheet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show approval status if already approved */}
      {timesheet.status !== 'pending_company_approval' && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timesheet.company_approved_at && (
                <p className="text-sm text-green-600">
                  ✓ Client approved on {new Date(timesheet.company_approved_at).toLocaleString()}
                </p>
              )}
              {timesheet.manager_approved_at && (
                <p className="text-sm text-green-600">
                  ✓ Final approval on {new Date(timesheet.manager_approved_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title="Client Approval Signature"
        description="Please sign below to approve this timesheet. Your signature confirms that the hours and information are accurate."
        loading={submitting}
      />
    </div>
  )
}