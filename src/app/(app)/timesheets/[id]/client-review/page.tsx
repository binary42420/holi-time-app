"use client"

import React, { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar } from '@/components/Avatar'
import { Textarea } from "@/components/ui/textarea"

import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Signature,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTimesheet } from "@/hooks/use-api"
import { format } from "date-fns"

export default function ClientReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const timesheetId = params.id as string
  
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [signature, setSignature] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Fetch timesheet data
  const { data: timesheet, isLoading: loading, refetch } = useTimesheet(timesheetId);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Convert canvas to base64
    const signatureData = canvas.toDataURL()
    setSignature(signatureData)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  const approveTimesheet = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide your digital signature before approving",
        variant: "destructive",
      })
      return
    }

    setIsApproving(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType: 'client',
          signature
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve timesheet')
      }

      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved and sent to management for final approval",
      })

      router.push('/timesheets')
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve timesheet",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const rejectTimesheet = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting the timesheet",
        variant: "destructive",
      })
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject timesheet')
      }

      toast({
        title: "Timesheet Rejected",
        description: "The timesheet has been rejected and returned for corrections",
      })

      router.push('/timesheets')
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject timesheet",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;

      if (minutes === 0) {
        return `${formattedHour}:00 ${ampm}`;
      }

      const formattedMinute = minutes < 10 ? `0${minutes}` : minutes;
      return `${formattedHour}:${formattedMinute} ${ampm}`;
    } catch (error) {
      return '-';
    }
  }

  const calculateHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading timesheet...</div>
        </div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Timesheet not found</div>
        </div>
      </div>
    )
  }

  const { shift, assignedPersonnel } = timesheet

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Review</h1>
          <p className="text-muted-foreground">
            Review and approve the timesheet for your shift
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {timesheet.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shift Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job</Label>
              <p className="font-medium">{shift.jobName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(shift.date), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Time</Label>
              <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <p className="font-medium">{shift.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Worker Time Entries
          </CardTitle>
          <CardDescription>
            Review the clock in/out times for all workers on this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Clock In 1</TableHead>
                <TableHead>Clock Out 1</TableHead>
                <TableHead>Clock In 2</TableHead>
                <TableHead>Clock Out 2</TableHead>
                <TableHead>Clock In 3</TableHead>
                <TableHead>Clock Out 3</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedPersonnel.map((worker) => {
                const totalHours = worker.timeEntries.reduce((sum, entry) => 
                  sum + calculateHours(entry.clockIn, entry.clockOut), 0
                )
                
                return (
                  <TableRow key={worker.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={worker.employeeAvatar}
                          name={worker.employeeName}
                          size="xs"
                          className="h-8 w-8"
                        />
                        <span className="font-medium">{worker.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.roleCode}</Badge>
                    </TableCell>
                    {[1, 2, 3].map((entryNum) => {
                      const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
                      return (
                        <React.Fragment key={entryNum}>
                          <TableCell>{formatTime(entry?.clockIn)}</TableCell>
                          <TableCell>{formatTime(entry?.clockOut)}</TableCell>
                        </React.Fragment>
                      )
                    })}
                    <TableCell className="font-medium">
                      {totalHours.toFixed(2)} hrs
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Digital Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signature className="h-5 w-5" />
            Digital Signature
          </CardTitle>
          <CardDescription>
            Please sign below to approve this timesheet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full h-32 border rounded cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearSignature}>
              Clear Signature
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Rejection (Optional)
          </CardTitle>
          <CardDescription>
            If you need to reject this timesheet, please provide a reason
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push('/timesheets')}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={rejectTimesheet}
          disabled={isRejecting || !rejectionReason.trim()}
        >
          {isRejecting ? "Rejecting..." : "Reject Timesheet"}
          <XCircle className="ml-2 h-4 w-4" />
        </Button>
        <Button
          onClick={approveTimesheet}
          disabled={isApproving || !signature}
        >
          {isApproving ? "Approving..." : "Approve Timesheet"}
          <CheckCircle className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
