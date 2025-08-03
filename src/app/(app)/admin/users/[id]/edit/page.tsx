"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useUserById } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { UserRole } from "@prisma/client"
import { AvatarUploader } from "@/components/avatar-uploader"
import { getInitials } from "@/lib/utils"

function EditUserPage() {
  const { user: adminUser } = useUser()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const userId = params.id as string
  const { data: userData, isLoading, error } = useUserById(userId)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    if (userData) {
      setName(userData.name)
      setEmail(userData.email)
    }
  }, [userData])

  if (adminUser?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAvatarFile(e.target.files[0]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let uploadedAvatarUrl = userData?.avatarUrl;

    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      try {
        const uploadResponse = await fetch(`/api/users/${userId}/upload-avatar`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { avatarUrl } = await uploadResponse.json();
          uploadedAvatarUrl = avatarUrl;
        } else {
          throw new Error('Failed to upload avatar');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload avatar. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      name,
      email,
      avatarUrl: uploadedAvatarUrl,
    };

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User details updated.",
        });
        router.push(`/admin/users/${userId}`);
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-red-500">Error loading user details: {error.toString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Edit User</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <AvatarUploader
            src={userData?.avatarUrl}
            fallback={getInitials(name || email || 'U')}
            userId={userId}
            onUpload={async (file) => setAvatarFile(file)}
          />
        </div>
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  )
}

export default EditUserPage