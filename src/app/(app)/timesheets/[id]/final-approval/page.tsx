"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from "@/hooks/use-user"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Shield, CheckCircle, XCircle, Download } from "lucide-react"
import SignatureCaptureModal from '@/components/signature-capture-modal'
import { TimesheetDetails } from '@/components/timesheet-details'
import { UserRole } from '@prisma/client'

export default function FinalApprovalPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  const [timesheet, setTimesheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

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
    return user?.role === UserRole.Admin && timesheet?.status === 'pending_manager_approval'
  }

  const handleApprove = () => {
    setAction('approve')
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
          approvalType: 'final',
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
          <h1 className="text-2xl font-bold">Final Timesheet Approval</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {timesheet.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {/* Download signed PDF */}
      {timesheet.signed_pdf_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Client Signed Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" asChild>
              <a href={timesheet.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                View Signed PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={timesheet.signed_pdf_url} download>
                Download Signed PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Final approval section */}
      {canApprove() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Final Approval
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
                onClick={handleApprove}
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

      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title="Manager Final Approval"
        description="Please sign below to provide final approval for this timesheet."
        loading={submitting}
      />
    </div>
  )
}