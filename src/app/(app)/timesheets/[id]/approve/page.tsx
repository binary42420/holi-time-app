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
import { ArrowLeft, FileSignature, Download, Eye, Shield, CheckCircle, XCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const SignatureCaptureModal = dynamic(() => import('@/components/signature-capture-modal'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <LoadingSpinner className="h-8 w-8" />
      <span className="ml-2 text-muted-foreground">Loading signature pad...</span>
    </div>
  ),
});
import { TimesheetDetails } from '@/components/timesheet-details'
import { UserRole } from '@prisma/client'

export default function TimesheetApprovePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  // Get the ID from params (no need for use() hook)
  const id = params.id as string

  const [timesheet, setTimesheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [approvalType, setApprovalType] = useState<'client' | 'manager' | null>(null)

  useEffect(() => {
    if (id) {
      fetchTimesheet()
    }
  }, [id])

  const fetchTimesheet = async () => {
    try {
      const response = await fetch(`/api/timesheets/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTimesheet(data)
      } else {
        throw new Error('Failed to fetch timesheet')
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      toast({
        title: "Error",
        description: "Failed to load timesheet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const canApproveAsClient = () => {
    if (!user || !timesheet) return false
    
    const isAdmin = user.role === UserRole.Admin
    const isCompanyUser = user.role === UserRole.CompanyUser && user.companyId === timesheet.shift?.job?.companyId
    
    // Check if crew chief is assigned to this shift
    const isAssignedCrewChief = user.role === UserRole.CrewChief && 
      timesheet.shift?.assignedPersonnel?.some((assignment: any) => 
        assignment.user?.id === user.id
      )
    
    return timesheet.status === 'PENDING_COMPANY_APPROVAL' && (isAdmin || isCompanyUser || isAssignedCrewChief)
  }

  const canApproveAsManager = () => {
    return user?.role === UserRole.Admin && timesheet?.status === 'PENDING_MANAGER_APPROVAL'
  }

  const handleClientApprove = () => {
    setApprovalType('client')
    setShowSignatureModal(true)
  }

  const handleManagerApprove = () => {
    setApprovalType('manager')
    setShowSignatureModal(true)
  }

  const handleReject = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/timesheets/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: notes.trim(),
          rejectedBy: user?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject timesheet')
      }

      toast({
        title: 'Success',
        description: 'Timesheet has been rejected'
      })

      await fetchTimesheet()

    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject timesheet',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignatureSubmit = async (signatureData: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          approvalType: approvalType === 'client' ? 'company' : 'manager',
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Timesheet not found</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Timesheet Approval</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {timesheet.status?.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {/* Download options */}
      {(timesheet.unsigned_pdf_url || timesheet.signed_pdf_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Options
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            {timesheet.unsigned_pdf_url && (
              <Button variant="outline" asChild>
                <a href={timesheet.unsigned_pdf_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  View Unsigned PDF
                </a>
              </Button>
            )}
            {timesheet.signed_pdf_url && (
              <Button variant="outline" asChild>
                <a href={timesheet.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  View Signed PDF
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client approval section */}
      {canApproveAsClient() && (
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
                onClick={handleClientApprove}
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

      {/* Manager approval section */}
      {canApproveAsManager() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Final Manager Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add approval notes or rejection reason..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={submitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={handleManagerApprove}
                disabled={submitting}
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Final Approve & Sign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show approval status if already processed */}
      {timesheet.status !== 'PENDING_COMPANY_APPROVAL' && timesheet.status !== 'PENDING_MANAGER_APPROVAL' && (
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
        title={approvalType === 'client' ? "Client Approval Signature" : "Manager Final Approval"}
        description={approvalType === 'client' 
          ? "Please sign below to approve this timesheet. Your signature confirms that the hours and information are accurate."
          : "Please sign below to provide final approval for this timesheet."
        }
        loading={submitting}
      />
    </div>
  )
}