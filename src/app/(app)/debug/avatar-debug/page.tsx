'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getInitials } from "@/lib/utils";

interface DebugAvatarProps {
  src?: string | null;
  name: string;
  userId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-8 h-8 text-sm',
  sm: 'w-12 h-12 text-base',
  md: 'w-16 h-16 text-lg',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-24 h-24 text-2xl'
};

function DebugAvatar({
  src,
  name,
  userId,
  size = 'md',
  className = ''
}: DebugAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(src ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
    console.log(`[DebugAvatar] ${info}`);
  };

  useEffect(() => {
    addDebugInfo(`useEffect triggered - src: ${src}, userId: ${userId}`);
    setIsLoading(true);
    setHasError(false);
    
    if (userId) {
      const timestamp = Date.now();
      const avatarUrl = `/api/users/${userId}/avatar/image?t=${timestamp}`;
      addDebugInfo(`Setting imageUrl from userId: ${avatarUrl}`);
      setImageUrl(avatarUrl);
      setIsLoading(false);
    } else if (src) {
      addDebugInfo(`Setting imageUrl from src: ${src}`);
      setImageUrl(src);
      setIsLoading(false);
    } else {
      addDebugInfo('No src and no userId - showing initials only');
      setIsLoading(false);
      setImageUrl(null);
      setHasError(false);
    }
  }, [src, userId]);

  const handleImageLoad = () => {
    addDebugInfo('Image loaded successfully');
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = (e: any) => {
    addDebugInfo(`Image failed to load: ${e.target?.src || 'unknown'}`);
    setIsLoading(false);
    setHasError(true);
    setImageUrl(null);
  };

  const sizeClass = sizeClasses[size];
  const initials = getInitials(name);

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="font-semibold mb-2">{name}</h3>
      
      <div className="flex items-start gap-4">
        {/* Avatar Display */}
        <div className={`relative inline-flex items-center justify-center overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600 ${sizeClass} ${className}`}>
          {isLoading ? (
            <div className="w-1/2 h-1/2 bg-gray-300 rounded-full animate-pulse" />
          ) : imageUrl && !hasError ? (
            imageUrl.startsWith('data:') ? (
              <img
                src={imageUrl}
                alt={name}
                className="absolute w-full h-full object-cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <Image
                src={imageUrl}
                alt={name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
                unoptimized={true}
              />
            )
          ) : (
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {initials}
            </span>
          )}
        </div>
        
        {/* Debug Info */}
        <div className="flex-1 text-xs">
          <p><strong>Props:</strong></p>
          <p>- src: {src || 'null'}</p>
          <p>- userId: {userId || 'null'}</p>
          <p>- name: {name}</p>
          
          <p className="mt-2"><strong>State:</strong></p>
          <p>- imageUrl: {imageUrl || 'null'}</p>
          <p>- isLoading: {isLoading.toString()}</p>
          <p>- hasError: {hasError.toString()}</p>
          <p>- initials: {initials}</p>
          
          <p className="mt-2"><strong>Debug Log:</strong></p>
          <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
            {debugInfo.map((info, index) => (
              <p key={index} className="text-xs">{info}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AvatarDebugPage() {
  const testUserId = 'cmdtftrs70007kz8x7q3kt4km'; // Ryley Holmes
  const testUserName = 'Ryley Holmes';

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Avatar Debug Page</h1>
      
      <div className="grid gap-6">
        <DebugAvatar 
          name={testUserName} 
          userId={testUserId} 
          size="lg" 
        />
        
        <DebugAvatar 
          src={`/api/users/${testUserId}/avatar/image`}
          name={testUserName} 
          size="lg" 
        />
        
        <DebugAvatar 
          src={`/api/users/${testUserId}/avatar/image`}
          name={testUserName} 
          userId={testUserId} 
          size="lg" 
        />
        
        <DebugAvatar 
          name="No Avatar User" 
          size="lg" 
        />
      </div>
    </div>
  );
}