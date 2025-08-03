"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useCompany } from "@/hooks/use-api"
import { useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { UserRole } from "@prisma/client";
import { CompanyAvatar } from "@/components/CompanyAvatar";

function EditCompanyPage() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const companyId = params.id as string
  const { data: companyData, isLoading: loading, error } = useCompany(companyId)

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (companyData) {
      setName(companyData.name)
      setAddress(companyData.address || "")
      setPhone(companyData.phone || "")
      setEmail(companyData.email || "")
      setLogoUrl(companyData.company_logo_url || "")
    }
  }, [companyData])

  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    let uploadedLogoUrl = logoUrl;

    if (logoFile) {
      const formData = new FormData();
      formData.append('file', logoFile);

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedLogoUrl = url;
        } else {
          throw new Error('Failed to upload logo');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload logo. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      name,
      address,
      phone,
      email,
      company_logo_url: uploadedLogoUrl,
    };

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Invalidate and refetch company data
        queryClient.invalidateQueries({ queryKey: ['company', companyId] });
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        
        toast({
          title: "Success",
          description: "Company details updated successfully.",
        });
        router.push(`/companies/${companyId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2">Loading company details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-red-500">Error loading company details: {error.toString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <CompanyAvatar src={logoUrl} name={name} className="w-16 h-16 text-2xl" />
        <h1 className="text-2xl font-bold text-white">Edit Company</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required
            disabled={isSubmitting}
            className="disabled:opacity-50"
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input 
            id="address" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            disabled={isSubmitting}
            className="disabled:opacity-50"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            disabled={isSubmitting}
            className="disabled:opacity-50"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            disabled={isSubmitting}
            className="disabled:opacity-50"
          />
        </div>
        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input 
            id="logoUrl" 
            value={logoUrl} 
            onChange={(e) => setLogoUrl(e.target.value)} 
            disabled={isSubmitting}
            className="disabled:opacity-50"
          />
        </div>
        <div>
          <Label htmlFor="logoFile">Upload Logo</Label>
          <Input 
            id="logoFile" 
            type="file" 
            onChange={handleFileChange} 
            disabled={isSubmitting}
            className="disabled:opacity-50"
            accept="image/*"
          />
        </div>
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/companies/${companyId}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EditCompanyPage
