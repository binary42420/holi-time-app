"use client"

import React, { useState, useEffect } from 'react';
import { useUser } from "@/hooks/use-user";
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/Avatar';
import { AvatarUploader } from '@/components/avatar-uploader';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Shield,
  Edit,
  Save,
  X
} from "lucide-react";

import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user } = useUser();
  const { update } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
      setCurrentUser(user);
    }
  }, [user]); // Include user as dependency

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </div>
        </main>
      </div>
    );
  }

  const handleAvatarUpload = (file: File) => {
    setAvatarFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    try {
      let uploadedAvatarUrl = user.avatar;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);

        const uploadResponse = await fetch(`/api/users/${user.id}/avatar`, {
          method: 'POST',
          body: avatarFormData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedAvatarUrl = url;
        } else {
          throw new Error('Failed to upload avatar');
        }
      }

      // Update profile data
      const updateData = {
        ...formData,
        avatarUrl: uploadedAvatarUrl,
      };
      console.log('Sending update data:', updateData);
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Update session data
      await update({
        ...formData,
        avatarUrl: uploadedAvatarUrl,
      });
      
      setIsEditing(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {isEditing ? (
                  <AvatarUploader
                    src={currentUser?.avatarUrl}
                    fallback={getInitials(currentUser?.name || currentUser?.email || 'U')}
                    userId={currentUser?.id || ''}
                    onUploadSuccess={(url) => {
                      setCurrentUser(prev => prev ? { ...prev, avatarUrl: url } : null);
                      toast.success('Avatar updated successfully');
                    }}
                    onUploadError={(error) => {
                      toast.error(`Upload failed: ${error}`);
                    }}
                    size="xl"
                  />
                ) : (
                  <Avatar
                    src={currentUser?.avatarUrl}
                    name={currentUser?.name || currentUser?.email || 'U'}
                    userId={currentUser?.id}
                    size="xl"
                    enableSmartCaching={true}
                    className="w-24 h-24"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{user.name || 'User'}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Button
                      variant={isEditing ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="ml-auto"
                    >
                      {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                      {isEditing ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                  <Badge variant="secondary" className="mt-2 bg-indigo-500/20 text-indigo-300 border-none">
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role || 'Staff'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center"><User className="h-4 w-4 mr-2" />Full Name</Label>
                  <Input id="name" name="name" value={formData.name} disabled={!isEditing} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center"><Mail className="h-4 w-4 mr-2" />Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} disabled={!isEditing} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center"><Shield className="h-4 w-4 mr-2" />Role</Label>
                  <Input id="role" value={user.role || 'Staff'} disabled />
                </div>
              </div>
              {isEditing && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveChanges} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </main>
  );
}
