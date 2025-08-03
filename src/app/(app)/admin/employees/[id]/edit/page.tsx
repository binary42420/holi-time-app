"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useQueryClient } from '@tanstack/react-query';
import { useUserById } from '@/hooks/use-api';
import { useEnhancedAvatar } from '@/hooks/use-enhanced-performance';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserRole } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { toast } from 'sonner';
import { User } from '@/lib/types';
import { DashboardPage } from '@/components/DashboardPage';

interface FormData {
  name: string;
  email: string;
  role: UserRole;
  crewChiefEligible: boolean;
  forkOperatorEligible: boolean;
  location: string;
  certifications: string[];
  performance: number;
}

function EditEmployeePage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: adminUser } = useUser();
  const { data: employeeData, isLoading, isError } = useUserById(id as string);
  const { 
    avatarUrl: enhancedAvatarUrl, 
    uploadAvatar, 
    refreshCache, 
    handleCacheInvalidation,
    getAvatarUrl 
  } = useEnhancedAvatar(id as string);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: UserRole.Employee,
    crewChiefEligible: false,
    forkOperatorEligible: false,
    location: '',
    certifications: [] as string[],
    performance: 0,
  });

  useEffect(() => {
    if (employeeData) {
      setFormData({
        name: employeeData.name,
        email: employeeData.email,
        role: employeeData.role,
        crewChiefEligible: employeeData.crew_chief_eligible || false,
        forkOperatorEligible: employeeData.fork_operator_eligible || false,
        location: employeeData.location || '',
        certifications: employeeData.certifications || [],
        performance: employeeData.performance || 0,
      });
    }
  }, [employeeData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert performance to number, keep other fields as strings
    const processedValue = name === 'performance' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            setAvatarFile(new File([blob], file.name, { type: file.type }));
          }
        }, file.type);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let avatarUrl = employeeData?.avatarUrl;

      // Handle avatar upload with enhanced caching
      if (avatarFile) {
        const uploadResult = await uploadAvatar(avatarFile);
        avatarUrl = uploadResult.avatarUrl;
        
        // The enhanced avatar service automatically handles cache invalidation
        console.log('✅ Avatar uploaded and cache refreshed');
      }

      // Update user data
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, avatarUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const responseData = await response.json();
      
      // Handle any cache invalidation instructions from the API
      if (responseData.cacheInvalidation) {
        await handleCacheInvalidation(responseData.cacheInvalidation);
      }
      
      // Invalidate user queries
      await queryClient.invalidateQueries({ queryKey: ['users', id] });
      await   queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast.success("Employee Updated", {
        description: `${formData.name}'s information has been successfully updated.`,
      });
      
      // Redirect to employee profile page
      router.push(`/employees/${id}`);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    }
  };

  if (isLoading) return <DashboardPage title="Loading..."><div>Loading...</div></DashboardPage>;
  if (isError) return <DashboardPage title="Error"><div>Error loading employee data.</div></DashboardPage>;

  return (
    <DashboardPage title="Edit Employee" description={`Update the details for ${employeeData?.name}`}>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarPreview || enhancedAvatarUrl || employeeData?.avatarUrl} />
                <AvatarFallback>{employeeData?.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <Label htmlFor="avatar">Update Avatar</Label>
                <Input id="avatar" type="file" onChange={handleAvatarChange} accept="image/*" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="crewChiefEligible">Crew Chief Eligible</Label>
                    <Switch id="crewChiefEligible" checked={formData.crewChiefEligible} onCheckedChange={(checked) => handleSwitchChange('crewChiefEligible', checked)} />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="forkOperatorEligible">Forklift Operator Eligible</Label>
                    <Switch id="forkOperatorEligible" checked={formData.forkOperatorEligible} onCheckedChange={(checked) => handleSwitchChange('forkOperatorEligible', checked)} />
                </div>
            </div>
            <div>
              <Label htmlFor="certifications">Certifications (comma-separated)</Label>
              <Input id="certifications" value={formData.certifications.join(', ')} onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value.split(',').map(s => s.trim()) }))} />
            </div>
            <div>
              <Label htmlFor="performance">Performance Rating (0-10)</Label>
              <Input id="performance" name="performance" type="number" min="0" max="10" step="0.1" value={formData.performance} onChange={handleChange} />
            </div>
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

export default withAuth(EditEmployeePage, UserRole.Admin);
