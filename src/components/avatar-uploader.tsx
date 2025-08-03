"use client"

import React, { useState, useRef, useCallback } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { avatarApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploaderProps {
  src?: string | null;
  fallback: React.ReactNode;
  userId: string;
  onUpload?: (file: File) => Promise<void>;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32'
}

export function AvatarUploader({
  src,
  fallback,
  userId,
  onUpload,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  size = 'lg'
}: AvatarUploaderProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, WebP, or GIF)';
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Invalid File',
        description: validationError,
        variant: 'destructive'
      });
      onUploadError?.(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      if (onUpload) {
        await onUpload(file);
      } else {
        const result = await avatarApi.uploadAvatar(userId, file);
        onUploadSuccess?.(result.url);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Success',
        description: 'Avatar updated successfully'
      });

      setTimeout(() => {
        setPreview(null);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);

      let errorMessage = 'Upload failed. Please try again.';

      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('too large') || msg.includes('size')) {
          errorMessage = 'Image is too large. Please try a smaller image (under 5MB).';
        } else if (msg.includes('invalid') || msg.includes('format')) {
          errorMessage = 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.';
        } else if (msg.includes('processing')) {
          errorMessage = 'Image processing failed. Please try a different image.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      onUploadError?.(errorMessage);
      setPreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, onUpload, userId, onUploadSuccess, onUploadError]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleFileUpload(file);
    event.target.value = '';
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [disabled, isUploading, handleFileUpload]);

  const handleRemoveAvatar = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (disabled || isUploading) return;

    try {
      await avatarApi.deleteAvatar(userId);
      setPreview(null);

      toast({
        title: 'Success',
        description: 'Avatar removed successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove avatar';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [disabled, isUploading, userId]);

  const sizeClass = sizeClasses[size];

  return (
    <div className="relative group">
      <div
        className={`relative cursor-pointer transition-all duration-200 ${sizeClass} ${
          isDragging ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Avatar
          src={preview || src || undefined}
          name={typeof fallback === 'string' ? fallback : 'User'}
          userId={userId}
          size={size}
          enableSmartCaching={false}
          className={`${sizeClass} ${isDragging ? 'scale-105' : ''} transition-transform`}
        />

        <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-opacity ${
          isUploading || isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${disabled ? 'opacity-0' : ''}`}>
          {isUploading ? (
            <div className="text-white text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
              <div className="text-xs">{uploadProgress}%</div>
            </div>
          ) : isDragging ? (
            <Upload className="w-6 h-6 text-white" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute bottom-0 right-0 rounded-full shadow-lg border-2 border-background bg-background hover:bg-accent"
        onClick={handleUploadClick}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>

      {(src || preview) && !isUploading && !disabled && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemoveAvatar}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || isUploading}
      />

      <div className="mt-2 text-center">
        <p className="text-sm text-gray-600">
          {isUploading ? 'Uploading...' : 'Click or drag to upload'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP, GIF up to 5MB
        </p>
      </div>
    </div>
  );
}