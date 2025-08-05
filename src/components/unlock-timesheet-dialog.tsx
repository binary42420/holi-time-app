"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Unlock, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UnlockTimesheetDialogProps {
  timesheetId: string
  onUnlock?: () => void
  trigger?: React.ReactNode
}

export function UnlockTimesheetDialog({ 
  timesheetId, 
  onUnlock,
  trigger 
}: UnlockTimesheetDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleUnlock = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for unlocking this timesheet.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlock timesheet')
      }

      toast({
        title: "Success",
        description: "Timesheet has been unlocked successfully.",
      })

      setOpen(false)
      setReason('')
      setNotes('')
      onUnlock?.()
    } catch (error) {
      console.error('Error unlocking timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlock timesheet",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Unlock className="h-4 w-4 mr-2" />
      Unlock
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Unlock Timesheet
          </DialogTitle>
          <DialogDescription>
            This will revert the timesheet back to draft status, clearing all approvals and signatures.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action will remove all approvals, signatures, and generated PDFs. 
            The timesheet will need to go through the approval process again.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">
              Reason for unlocking <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              placeholder="e.g., Incorrect hours, missing break time, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUnlock}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Unlocking...' : 'Unlock Timesheet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}