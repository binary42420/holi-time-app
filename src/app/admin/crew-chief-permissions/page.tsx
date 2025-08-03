'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'
;
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, Plus, Trash2, Building, Briefcase, Users, Crown } from "lucide-react";
import type { CrewChiefPermission, CrewChiefPermissionType, User, Company } from '@/lib/types';
import { UserRole } from '@prisma/client';

interface PermissionWithDetails extends Omit<CrewChiefPermission, 'permissionType'> {
  userName: string;
  grantedByName: string;
  targetName: string;
  permissionType: CrewChiefPermissionType;
  grantedAt: string;
  userId: string;
  assignedPersonnelId: string;
}

export default function CrewChiefPermissionsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  
  // Grant permission form state
  const [grantForm, setGrantForm] = useState({
    userId: '',
    permissionType: '' as CrewChiefPermissionType,
    targetId: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all permissions, users, clients, jobs, and shifts
      const [permissionsRes, usersRes, clientsRes, jobsRes, shiftsRes] = await Promise.all([
        fetch('/api/crew-chief-permissions?all=true'),
        fetch('/api/users'),
        fetch('/api/companies'),
        fetch('/api/jobs'),
        fetch('/api/shifts'),
      ]);

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData.permissions || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = usersData.users || [];
        setUsers(users.filter((u: User) => ['Employee', 'Crew Chief'].includes(u.role)));
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }

      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch data
  useEffect(() => {
    if (session?.user?.role === UserRole.Admin) {
      fetchData();
    }
  }, [session, fetchData]);

  // Check if user is admin
  if (session?.user?.role !== UserRole.Admin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGrantPermission = async () => {
    if (!grantForm.userId || !grantForm.permissionType || !grantForm.targetId) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      const response = await fetch('/api/crew-chief-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grantForm),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission granted successfully',
        });
        setGrantForm({ userId: '', permissionType: '' as CrewChiefPermissionType, targetId: '' });
        await fetchData(); // Refresh data
      } else {
        throw new Error('Failed to grant permission');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant permission',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePermission = async (permission: PermissionWithDetails) => {
    try {
      const response = await fetch(
        `/api/crew-chief-permissions?assignedPersonnelId=${permission.assignedPersonnelId}&permissionType=${permission.permissionType}&targetId=${permission.targetId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission revoked successfully',
        });
        await fetchData(); // Refresh data
      } else {
        throw new Error('Failed to revoke permission');
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke permission',
        variant: 'destructive',
      });
    }
  };

  const getTargetOptions = () => {
    switch (grantForm.permissionType) {
      case 'client':
        return clients.map(c => ({ value: c.id, label: c.name }));
      case 'job':
        return jobs.map(j => ({ value: j.id, label: `${j.name} (${j.clientName})` }));
      case 'shift':
        return shifts.map(s => ({ value: s.id, label: `${s.jobName} - ${s.date} ${s.startTime}` }));
      default:
        return [];
    }
  };

  const getPermissionIcon = (type: CrewChiefPermissionType) => {
    switch (type) {
      case 'client':
        return <Building className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      case 'shift':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (type: CrewChiefPermissionType) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'job':
        return 'bg-green-100 text-green-800';
      case 'shift':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crew Chief Permissions</h1>
        <p className="text-muted-foreground">
          Manage crew chief permissions for employees across clients, jobs, and shifts
        </p>
      </div>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="permissions">Active Permissions</TabsTrigger>
          <TabsTrigger value="grant">Grant Permission</TabsTrigger>
          <TabsTrigger value="users">User Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Active Crew Chief Permissions</CardTitle>
              <CardDescription>
                All currently active crew chief permissions in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissions.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Permissions Found</h3>
                  <p className="text-muted-foreground">No crew chief permissions have been granted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getPermissionIcon(permission.permissionType)}
                          <Badge className={getPermissionColor(permission.permissionType)}>
                            {permission.permissionType.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{permission.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            Granted by {permission.grantedByName} on{' '}
                            {new Date(permission.grantedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Permission</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke this crew chief permission? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevokePermission(permission)}>
                              Revoke Permission
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grant">
          <Card>
            <CardHeader>
              <CardTitle>Grant Crew Chief Permission</CardTitle>
              <CardDescription>
                Grant crew chief permissions to employees for specific clients, jobs, or shifts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="user">User</Label>
                  <Select value={grantForm.userId} onValueChange={(value) => setGrantForm(prev => ({ ...prev, userId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center space-x-2">
                            <Crown className="h-4 w-4" />
                            <span>{user.name} ({user.role})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="permissionType">Permission Type</Label>
                  <Select 
                    value={grantForm.permissionType} 
                    onValueChange={(value: CrewChiefPermissionType) => setGrantForm(prev => ({ ...prev, permissionType: value, targetId: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>Client (All jobs/shifts)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="job">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4" />
                          <span>Job (All shifts)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="shift">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Specific Shift</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target">Target</Label>
                  <Select 
                    value={grantForm.targetId} 
                    onValueChange={(value) => setGrantForm(prev => ({ ...prev, targetId: value }))}
                    disabled={!grantForm.permissionType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTargetOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGrantPermission} 
                disabled={isGranting || !grantForm.userId || !grantForm.permissionType || !grantForm.targetId}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isGranting ? 'Granting Permission...' : 'Grant Permission'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Overview</CardTitle>
              <CardDescription>
                Overview of all eligible users and their current permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => {
                  const userPermissions = permissions.filter(p => p.userId === user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5" />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {userPermissions.length} permission{userPermissions.length !== 1 ? 's' : ''}
                        </Badge>
                        {userPermissions.map(permission => (
                          <Badge key={permission.id} className={getPermissionColor(permission.permissionType)}>
                            {permission.permissionType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
