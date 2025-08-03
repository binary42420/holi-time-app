"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, XCircle } from "lucide-react";
import { useApiMutation } from "@/hooks/use-api";
import { Company } from "@/lib/types";

interface CompanyAvatarUploaderProps {
  companyId: string;
  currentLogoUrl?: string | null;
  onUploadSuccess: (newLogoUrl: string) => void;
}

export function CompanyAvatarUploader({
  companyId,
  currentLogoUrl,
  onUploadSuccess,
}: CompanyAvatarUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useApiMutation<Company, FormData>(
    async (formData) => {
      const response = await fetch(`/api/companies/${companyId}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload avatar");
      }
      return response.json();
    },
    {
      invalidateQueries: [["company", companyId]],
      onSuccess: (data) => {
        toast({
          title: "Success",
          description: "Company logo updated successfully.",
        });
        onUploadSuccess(data.company_logo_url || "");
        setSelectedFile(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to upload company logo.",
          variant: "destructive",
        });
      },
    }
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(currentLogoUrl);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", selectedFile);

    uploadMutation.mutate(formData);
  };

  const handleRemove = async () => {
    // Implement remove functionality if needed
    // For now, just clear the preview and selected file
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Optionally, call an API to remove the current logo from the server
    // and update the database to set company_logo_url to null
    toast({
      title: "Logo cleared",
      description: "The selected logo has been cleared from preview. Upload to save changes.",
    });
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="company-logo" className="text-lg font-semibold">Company Logo</Label>
      <div className="flex items-center space-x-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Company Logo Preview"
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-500 text-xs text-center">
              No Logo
            </div>
          )}
        </div>
        <div className="flex-grow space-y-2">
          <Input
            id="company-logo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-500 file:text-white
            hover:file:bg-indigo-600
            cursor-pointer"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="flex-grow bg-green-600 hover:bg-green-700"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {uploadMutation.isPending ? "Uploading..." : "Upload New Logo"}
            </Button>
            {previewUrl && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={uploadMutation.isPending}
                className="flex-grow border-red-500 text-red-500 hover:bg-red-900/20"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Clear Preview
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}