"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useUsers, useShifts } from "@/hooks/use-api"
import { UserRole } from "@prisma/client"
import {
  Card,
  Table,
  Button,
  Badge,
  Select,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
} from "@mantine/core"
import {
  ArrowLeft,
  Download,
  Clock,
  BarChart3
} from "lucide-react"
import { subDays, startOfMonth, endOfMonth } from "date-fns"
import { useToast } from "@/hooks/use-toast"

function EmployeeReportsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [reportType, setReportType] = useState("performance")
  const [dateRange, setDateRange] = useState("thisMonth")
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  const { data: users } = useUsers()
  const { data: shifts } = useShifts()

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const employees = users?.users?.filter(u => u.role !== UserRole.CompanyUser) || []

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'lastWeek':
        return { start: subDays(now, 7), end: now }
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }
      case 'last3Months':
        return { start: subDays(now, 90), end: now }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // Generate performance report data
  const generatePerformanceReport = () => {
    const { start, end } = getDateRange()
    
    if (!shifts) return []
    
    return employees.map(employee => {
      const employeeShifts = shifts.filter(shift =>
        shift.assignedPersonnel.some(a => a.userId === employee.id) &&
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const completedShifts = employeeShifts.filter(shift => shift.status === 'Completed')
      const totalHours = completedShifts.reduce((sum, shift) => {
        const start = new Date(`2000-01-01 ${shift.startTime}`)
        const end = new Date(`2000-01-01 ${shift.endTime}`)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        shiftsAssigned: employeeShifts.length,
        shiftsCompleted: completedShifts.length,
        completionRate: employeeShifts.length > 0 ? (completedShifts.length / employeeShifts.length * 100) : 0,
        totalHours: totalHours,
        avgHoursPerShift: completedShifts.length > 0 ? totalHours / completedShifts.length : 0,
      }
    }).filter(emp => selectedEmployee === 'all' || emp.id === selectedEmployee)
  }

  // Generate attendance report data
  const generateAttendanceReport = () => {
    const { start, end } = getDateRange()
    
    if (!shifts) return []
    
    return employees.map(employee => {
      const employeeShifts = shifts.filter(shift =>
        shift.assignedPersonnel.some(a => a.userId === employee.id) &&
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const attendedShifts = employeeShifts.filter(shift =>
        shift.status === 'Completed' || shift.status === 'InProgress'
      )
      const noShowShifts = employeeShifts.filter(shift => shift.status === 'Cancelled')

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        scheduledShifts: employeeShifts.length,
        attendedShifts: attendedShifts.length,
        noShows: noShowShifts.length,
        attendanceRate: employeeShifts.length > 0 ? (attendedShifts.length / employeeShifts.length * 100) : 0,
      }
    }).filter(emp => selectedEmployee === 'all' || emp.id === selectedEmployee)
  }

  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being prepared for download.",
    })
    // In a real app, this would trigger a CSV/PDF export
  }

  const performanceData = generatePerformanceReport()
  const attendanceData = generateAttendanceReport()

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin/employees')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Employees
            </Button>
            <Title order={1}>Employee Reports</Title>
            <Text c="dimmed">Analyze employee performance and attendance</Text>
          </Stack>
          <Button
            leftSection={<Download size={16} />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        </Group>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Title order={4}>Report Filters</Title>
            <Text size="sm" c="dimmed">Configure your report parameters</Text>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Report Type"
                  value={reportType}
                  onChange={(value) => setReportType(value || "performance")}
                  data={[
                    { value: 'performance', label: 'Performance Report' },
                    { value: 'attendance', label: 'Attendance Report' },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(value) => setDateRange(value || "thisMonth")}
                  data={[
                    { value: 'lastWeek', label: 'Last Week' },
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'lastMonth', label: 'Last Month' },
                    { value: 'last3Months', label: 'Last 3 Months' },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Employee"
                  value={selectedEmployee}
                  onChange={(value) => setSelectedEmployee(value || "all")}
                  data={[
                    { value: 'all', label: 'All Employees' },
                    ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                  ]}
                />
              </Grid.Col>
            </Grid>
          </Card.Section>
        </Card>

        {reportType === 'performance' && (
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <Group>
                <BarChart3 size={20} />
                <Title order={4}>Performance Report</Title>
              </Group>
              <Text size="sm" c="dimmed">Employee performance metrics for the selected period</Text>
            </Card.Section>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Shifts Assigned</Table.Th>
                  <Table.Th>Shifts Completed</Table.Th>
                  <Table.Th>Completion Rate</Table.Th>
                  <Table.Th>Total Hours</Table.Th>
                  <Table.Th>Avg Hours/Shift</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {performanceData.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td><Text fw={500}>{employee.name}</Text></Table.Td>
                    <Table.Td><Badge variant="light">{employee.role}</Badge></Table.Td>
                    <Table.Td>{employee.shiftsAssigned}</Table.Td>
                    <Table.Td>{employee.shiftsCompleted}</Table.Td>
                    <Table.Td>
                      <Badge color={employee.completionRate >= 90 ? 'green' : employee.completionRate >= 70 ? 'yellow' : 'red'}>
                        {employee.completionRate.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                    <Table.Td>{employee.totalHours.toFixed(1)}h</Table.Td>
                    <Table.Td>{employee.avgHoursPerShift.toFixed(1)}h</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        {reportType === 'attendance' && (
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <Group>
                <Clock size={20} />
                <Title order={4}>Attendance Report</Title>
              </Group>
              <Text size="sm" c="dimmed">Employee attendance metrics for the selected period</Text>
            </Card.Section>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Scheduled Shifts</Table.Th>
                  <Table.Th>Attended Shifts</Table.Th>
                  <Table.Th>No Shows</Table.Th>
                  <Table.Th>Attendance Rate</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {attendanceData.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td><Text fw={500}>{employee.name}</Text></Table.Td>
                    <Table.Td><Badge variant="light">{employee.role}</Badge></Table.Td>
                    <Table.Td>{employee.scheduledShifts}</Table.Td>
                    <Table.Td>{employee.attendedShifts}</Table.Td>
                    <Table.Td>
                      <Badge color={employee.noShows > 0 ? 'red' : 'gray'}>
                        {employee.noShows}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={employee.attendanceRate >= 95 ? 'green' : employee.attendanceRate >= 80 ? 'yellow' : 'red'}>
                        {employee.attendanceRate.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>
    </Container>
  )
}

export default EmployeeReportsPage;
