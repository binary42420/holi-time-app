"use client"

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserById } from '@/hooks/use-api';
import { UserRole } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { ArrowLeft, Edit, User, Crown, Truck, HardHat } from "lucide-react";
import { DashboardPage } from '@/components/DashboardPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: employee, isLoading, isError } = useUserById(id as string);

  if (isLoading) {
    return (
      <DashboardPage title="Loading Profile...">
        <div className="flex justify-center items-center h-64">
          <User className="h-12 w-12 animate-spin" />
        </div>
      </DashboardPage>
    );
  }

  if (isError || !employee) {
    return (
      <DashboardPage title="Error">
        <div className="text-center">
          <p className="text-destructive">Could not load employee profile.</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardPage>
    );
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'CrewChief': return 'default';
      case 'Employee': return 'secondary';
      case 'CompanyUser': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <DashboardPage
      title="Employee Profile"
      description={`Details for ${employee.name}`}
      buttonText="Edit Employee"
      buttonAction={() => router.push(`/admin/employees/${id}/edit`)}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={employee.avatarUrl} />
                <AvatarFallback>{employee.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{employee.name}</h2>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
              <Badge variant={getRoleBadgeVariant(employee.role)} className="mt-2">
                {employee.role}
              </Badge>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <p className="font-medium">Location:</p>
                <p className="text-muted-foreground">{employee.location || 'Not specified'}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-blue-500" />
                  Crew Chief Eligible:
                </p>
                <Badge variant={employee.crew_chief_eligible ? 'default' : 'secondary'} className={employee.crew_chief_eligible ? 'status-info' : ''}>
                  <Crown className="h-3 w-3 mr-1" />
                  {employee.crew_chief_eligible ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <p className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-500" />
                  Fork Operator Eligible:
                </p>
                <Badge variant={employee.fork_operator_eligible ? 'default' : 'secondary'} className={employee.fork_operator_eligible ? 'status-success' : ''}>
                  <Truck className="h-3 w-3 mr-1" />
                  {employee.fork_operator_eligible ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <p className="font-medium flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-orange-500" />
                  OSHA 10 Certified:
                </p>
                <Badge variant={employee.OSHA_10_Certifications ? 'default' : 'secondary'} className={employee.OSHA_10_Certifications ? 'status-warning' : ''}>
                  <HardHat className="h-3 w-3 mr-1" />
                  {employee.OSHA_10_Certifications ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <p className="font-medium">Performance Rating:</p>
                <p className="text-muted-foreground">{employee.performance ?? 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium mb-2">Certifications:</p>
                <div className="flex flex-wrap gap-2">
                  {employee.certifications?.length > 0 ? (
                    employee.certifications.map(cert => (
                      <Badge key={cert} variant="outline">{cert}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
export default withAuth(EmployeeProfilePage, UserRole.Admin);