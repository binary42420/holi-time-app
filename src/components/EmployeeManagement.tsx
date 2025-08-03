"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useUsers } from "@/hooks/use-api"
import { UserRole } from "@prisma/client"
import {
  TextInput,
  Menu,
  Group,
  Stack,
  Title,
  Text,
  ActionIcon,
  Loader,
  Center,
  Container,
} from "@mantine/core"
import {
  ArrowLeft,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  UserCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { toast } from "sonner"
import { DashboardPage } from "@/components/DashboardPage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function EmployeeManagement({ initialData }: { initialData: any }) {
  const { user } = useUser()
  const router = useRouter()
  const { toast: legacyToast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading: loading, error, refetch } = useUsers({
    page,
    role: roleFilter === 'all' ? undefined : roleFilter,
    initialData,
  });

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const employees = data?.users || []
  const pagination = data?.pagination;

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      try {
        console.log(`Attempting to delete user ${employeeId} (${employeeName})`);
        
        const response = await fetch(`/api/users/${employeeId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        console.log(`Delete response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Delete success:', result);
          
          toast.success("Employee Deleted", {
            description: `${employeeName} has been successfully deleted.`,
          })
          await refetch()
        } else {
          let errorMessage = 'Failed to delete employee';
          let errorDetails = '';
          
          try {
            const errorData = await response.json();
            console.log('Error response:', errorData);
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details) {
              errorDetails = `\n\nDetails: ${errorData.details}`;
            }
            if (errorData.type) {
              errorDetails += `\nError Type: ${errorData.type}`;
            }
          } catch (parseError) {
            console.log('Failed to parse error response:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          // Show specific error message
          toast.error("Delete Failed", {
            description: errorMessage + errorDetails,
          })
          return; // Don't throw, just show the toast
        }
      } catch (error) {
        console.error('Delete employee error:', error);
        
        // Handle network errors specifically
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast.error("Network Error", {
            description: "Unable to connect to the server. Please check your internet connection.",
          })
        } else {
          toast.error("Delete Failed", {
            description: error instanceof Error ? error.message : "An unexpected error occurred while deleting the employee.",
          })
        }
      }
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'destructive'
      case 'CrewChief': return 'default'
      case 'Employee': return 'secondary'
      case 'CompanyUser': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <DashboardPage title="Loading Employees...">
        <div className="flex justify-center items-center h-64">
          <Users className="h-12 w-12 animate-spin" />
        </div>
      </DashboardPage>
    )
  }

  if (error) {
    return (
      <DashboardPage title="Error">
        <div className="flex justify-center items-center h-64">
          <p className="text-destructive">Error loading Employees: {error.toString()}</p>
        </div>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage
      title="Employee Management"
      description="Manage workforce and employee records"
      buttonText="Add Employee"
      buttonAction={() => router.push('/employees/new')}
    >
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Employees</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value as UserRole | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.values(UserRole).map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recent Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  onClick={() => router.push(`/employees/${employee.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={employee.avatarUrl}
                        name={employee.name}
                        userId={employee.id}
                        size="xl"
                        enableSmartCaching={true}
                        className="h-16 w-16"
                      />
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {employee.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(employee.role)}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground">Last shift: 2 days ago</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit Employee</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Employee</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} variant="outline">
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
              <Button onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))} disabled={page === pagination.totalPages} variant="outline">
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}