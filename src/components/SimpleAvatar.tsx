import Image from 'next/image';
import React, { useState } from 'react';
import { getInitials } from "@/lib/utils";

interface SimpleAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'w-8 h-8 text-sm',
  sm: 'w-12 h-12 text-base',
  md: 'w-16 h-16 text-lg',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-24 h-24 text-2xl'
};

export function SimpleAvatar({
  src,
  name,
  className = '',
  size = 'md'
}: SimpleAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClass = sizeClasses[size];
  const initials = getInitials(name);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600 ${sizeClass} ${className}`}>
      {src && !hasError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
          )}
          <Image
            src={src}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            unoptimized={src.includes('googleusercontent.com')} // Disable optimization for Google images
          />
        </>
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">
          {initials}
        </span>
      )}
    </div>
  );
}