"use client"

import React, { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Card,
  Text,
  Button,
  Badge,
  Table,
  Avatar,
  Textarea,
  Group,
  Stack,
  Title,
  Container,
  Paper,
  Loader,
  Center,
  Image,
  Grid,
} from "@mantine/core"
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Signature,
  Download,
  Shield,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTimesheet } from "@/hooks/use-api"
import { format } from "date-fns"

export default function ManagerReviewPage() {
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
          approvalType: 'manager',
          signature
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve timesheet')
      }

      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved and marked as completed",
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
      <Container size="md" py="xl">
        <Center style={{ height: '64vh' }}>
          <Loader />
          <Text ml="md">Loading timesheet...</Text>
        </Center>
      </Container>
    )
  }

  if (!timesheet) {
    return (
      <Container size="md" py="xl">
        <Center style={{ height: '64vh' }}>
          <Text>Timesheet not found</Text>
        </Center>
      </Container>
    )
  }

  const { shift, assignedPersonnel } = timesheet

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={1}>Manager Review</Title>
            <Text c="dimmed">
              Final review and approval of the timesheet
            </Text>
          </Stack>
          <Badge
            variant="outline"
            leftSection={<Shield size={14} />}
          >
            {timesheet.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </Group>

      {/* Client Approval Status */}
      {timesheet.clientApprovedAt && (
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <CheckCircle size={20} color="green" />
              <Title order={4}>Client Approval</Title>
            </Group>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Group justify="space-between">
              <Stack gap="xs">
                <Text fw={500}>Approved by {shift.clientName}</Text>
                <Text size="sm" c="dimmed">
                  {format(new Date(timesheet.clientApprovedAt), 'MMMM d, yyyy at h:mm a')}
                </Text>
              </Stack>
              {timesheet.clientSignature && (
                <Stack align="flex-end" gap="xs">
                  <Text size="sm" c="dimmed">Client Signature:</Text>
                  <Paper withBorder style={{ height: 64 }}>
                    <Image
                      src={timesheet.clientSignature}
                      alt="Client Signature"
                      height={64}
                      fit="contain"
                    />
                  </Paper>
                </Stack>
              )}
            </Group>
          </Card.Section>
        </Card>
      )}

      {/* Shift Information */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Building2 size={20} />
            <Title order={4}>Shift Information</Title>
          </Group>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Text size="sm" c="dimmed">Job</Text>
              <Text fw={500}>{shift.jobName}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Text size="sm" c="dimmed">Client</Text>
              <Text fw={500}>{shift.clientName}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Text size="sm" c="dimmed">Date</Text>
              <Text fw={500}>{format(new Date(shift.date), 'MMMM d, yyyy')}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Text size="sm" c="dimmed">Crew Chief</Text>
              <Text fw={500}>{shift.crewChiefName}</Text>
            </Grid.Col>
          </Grid>
        </Card.Section>
      </Card>

      {/* Time Entries */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Clock size={20} />
            <Title order={4}>Worker Time Entries</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Review and verify all worker time entries for accuracy
          </Text>
        </Card.Section>
        <Card.Section>
          <Table horizontalSpacing="md" verticalSpacing="sm" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Worker</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Clock In 1</Table.Th>
                <Table.Th>Clock Out 1</Table.Th>
                <Table.Th>Clock In 2</Table.Th>
                <Table.Th>Clock Out 2</Table.Th>
                <Table.Th>Clock In 3</Table.Th>
                <Table.Th>Clock Out 3</Table.Th>
                <Table.Th>Total Hours</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {assignedPersonnel.map((worker) => {
                const totalHours = worker.timeEntries.reduce((sum, entry) => 
                  sum + calculateHours(entry.clockIn, entry.clockOut), 0
                )
                
                return (
                  <Table.Tr key={worker.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar src={worker.employeeAvatar} radius="xl">
                          {worker.employeeName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Text fw={500}>{worker.employeeName}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline">{worker.roleCode}</Badge>
                    </Table.Td>
                    {[1, 2, 3].map((entryNum) => {
                      const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
                      return (
                        <React.Fragment key={entryNum}>
                          <Table.Td>{formatTime(entry?.clockIn)}</Table.Td>
                          <Table.Td>{formatTime(entry?.clockOut)}</Table.Td>
                        </React.Fragment>
                      )
                    })}
                    <Table.Td>
                      <Text fw={500}>{totalHours.toFixed(2)} hrs</Text>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Card.Section>
      </Card>

      {/* Manager Signature */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Signature size={20} />
            <Title order={4}>Manager Signature</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Please sign below to provide final approval for this timesheet
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Stack>
            <Paper withBorder style={{ borderStyle: 'dashed', cursor: 'crosshair' }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </Paper>
            <Group>
              <Button variant="default" onClick={clearSignature}>
                Clear Signature
              </Button>
            </Group>
          </Stack>
        </Card.Section>
      </Card>

      {/* Rejection Reason */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <XCircle size={20} />
            <Title order={4}>Rejection (Optional)</Title>
          </Group>
          <Text size="sm" c="dimmed">
            If you need to reject this timesheet, please provide a reason
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={3}
          />
        </Card.Section>
      </Card>

        {/* Action Buttons */}
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => router.push('/timesheets')}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={rejectTimesheet}
            loading={isRejecting}
            disabled={!rejectionReason.trim()}
            leftSection={<XCircle size={16} />}
          >
            Reject Timesheet
          </Button>
          <Button
            color="green"
            onClick={approveTimesheet}
            loading={isApproving}
            disabled={!signature}
            leftSection={<CheckCircle size={16} />}
          >
            Final Approval
          </Button>
        </Group>
      </Stack>
    </Container>
  )
}
