'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TimesheetDetails } from '@/components/timesheet-details'
import { SignatureCaptureModal } from '@/components/signature-capture-modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { TimesheetStatusIndicator } from '@/components/timesheet-status-indicator'
import { api } from '@/lib/api'

export default function ManagerApprovalPage() {
  const { id } = useParams()
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  
  const { toast } = useToast()

  const { data: timesheet, isLoading } = useQuery({
    queryKey: ['timesheet', id],
    queryFn: async () => {
      return await api.get<any>(`/api/timesheets?id=${id}`)
    }
  })

  const handleSignatureSubmit = async (signatureData: string) => {
    try {
      await api.post('/api/timesheets/manager-approval', {
        timesheetId: id,
        signatureData
      })

      toast({
        title: 'Success',
        description: 'Timesheet finalized successfully',
        variant: 'default'
      })
      setShowSignatureModal(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to finalize timesheet. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (!timesheet) return <div>Timesheet not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Timesheet Final Approval</h1>
        <TimesheetStatusIndicator status={timesheet.status} size="lg" />
      </div>

      <TimesheetDetails timesheet={timesheet} />

      {timesheet.status === 'PENDING_MANAGER_APPROVAL' && (
        <div className="flex justify-end">
          <Button onClick={() => setShowSignatureModal(true)}>
            Finalize Timesheet
          </Button>
        </div>
      )}

      <SignatureCaptureModal 
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title="Manager Approval Signature"
        description="Please sign below to finalize this timesheet"
      />
    </div>
  )
}
