'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { TimesheetDetails } from '@/components/timesheet-details'
import SignatureCaptureModal from '@/components/signature-capture-modal'
import { Button } from '@/components/ui/button'
import { useToast } from "@/hooks/use-toast"
import { TimesheetStatusIndicator } from '@/components/timesheet-status-indicator'
import { api } from '@/lib/api'
import { type TimesheetDetails as TimesheetDetailsType } from '@/lib/types'

export default function CompanyApprovalPage() {
  const { id } = useParams()
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  const [timesheet, setTimesheet] = useState<TimesheetDetailsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { toast } = useToast()

  const fetchTimesheet = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      // The API returns { success: boolean, timesheet: TimesheetDetailsType }
      // The api.get wrapper extracts the `timesheet` property.
      const data = await api.get<{ timesheet: TimesheetDetailsType }>(
        `/timesheets/${id}`
      )
      setTimesheet(data.timesheet)
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to fetch timesheet details.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    fetchTimesheet()
  }, [fetchTimesheet])

  const handleSignatureSubmit = async (signatureData: string) => {
    if (!id) return

    try {
      await api.post(`/timesheets/${id}/approve`, {
        signatureData,
      })

      toast({
        title: 'Success',
        description: 'Timesheet approved successfully',
        variant: 'default',
      })
      setShowSignatureModal(false)
      await fetchTimesheet() // Refresh data
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to approve timesheet. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (!timesheet) return <div>Timesheet not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Company Timesheet Approval</h1>
        <TimesheetStatusIndicator status={timesheet.status} size="lg" />
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {timesheet.status === 'PENDING_COMPANY_APPROVAL' && (
        <div className="flex justify-end">
          <Button onClick={() => setShowSignatureModal(true)}>
            Approve Timesheet
          </Button>
        </div>
      )}

      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title="Company Approval Signature"
        description="Please sign below as a company representative to approve this timesheet."
      />
    </div>
  )
}
