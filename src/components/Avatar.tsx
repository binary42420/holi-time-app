import Image from 'next/image';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { getInitials } from "@/lib/utils";


interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  userId?: string; // For smart caching
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  enableSmartCaching?: boolean;
  onLoadError?: () => void;
  onLoadSuccess?: () => void;
}

const sizeClasses = {
  xs: 'w-8 h-8 text-sm',
  sm: 'w-12 h-12 text-base',
  md: 'w-16 h-16 text-lg',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-24 h-24 text-2xl'
};

export const Avatar = memo(function Avatar({
  src,
  name,
  className = '',
  userId,
  size = 'md',
  enableSmartCaching = true,
  onLoadError,
  onLoadSuccess
}: AvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(src ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [cacheKey, setCacheKey] = useState<string>(() => Date.now().toString());


  // Handle image load success
  const handleImageLoad = useCallback(() => {
    console.log(`Avatar loaded successfully for ${name}`);
    setIsLoading(false);
    setHasError(false);
    onLoadSuccess?.();
  }, [onLoadSuccess, name]);

  // Handle image load error
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log(`Avatar failed to load for ${name}`);
    setIsLoading(false);
    setHasError(true);
    setImageUrl(null);
    onLoadError?.();
  }, [onLoadError, name]);

  // Generate avatar URL with cache busting
  const getAvatarUrl = useCallback((userId: string, cacheKey: string) => {
    return `/api/users/${userId}/avatar/image?t=${cacheKey}`;
  }, []);

  // Listen for avatar updates
  useEffect(() => {
    if (!userId) return;

    const handleAvatarUpdate = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        if (event.detail.deleted) {
          setImageUrl(null);
          setHasError(false);
        } else {
          // Update cache key to force refresh
          setCacheKey(Date.now().toString());
        }
      }
    };

    const handleCacheInvalidation = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        // Update cache key to force refresh
        setCacheKey(Date.now().toString());
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as any);
    window.addEventListener('avatarCacheInvalidated', handleCacheInvalidation as any);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as any);
      window.removeEventListener('avatarCacheInvalidated', handleCacheInvalidation as any);
    };
  }, [userId]);

  // Initial load and URL generation
  useEffect(() => {
    console.log(`Avatar useEffect triggered for ${name} (userId: ${userId}, cacheKey: ${cacheKey})`);
    setIsLoading(false);
    setHasError(false);
    
    if (userId) {
      // Generate direct API URL with cache busting
      const avatarUrl = getAvatarUrl(userId, cacheKey);
      console.log(`Setting avatar URL for ${name}: ${avatarUrl}`);
      setImageUrl(avatarUrl);
    } else if (src) {
      // Only use src if no userId is provided (for external/legacy usage)
      if (src.includes('/avatar/image')) {
        // Add cache busting for our avatar API
        const url = new URL(src, window.location.origin);
        url.searchParams.set('t', cacheKey);
        setImageUrl(url.toString());
      } else {
        // Use src as-is (external URLs, data URLs, etc.)
        setImageUrl(src);
      }
    } else {
      // No src and no userId - show initials only
      setImageUrl(null);
      setHasError(false);
    }
  }, [src, userId, cacheKey, getAvatarUrl, name]);





  const sizeClass = sizeClasses[size];
  const initials = getInitials(name);

  // If className contains size classes (w-* h-*), use those instead of sizeClass
  const hasCustomSize = className && (className.includes('w-') || className.includes('h-'));
  const finalSizeClass = hasCustomSize ? '' : sizeClass;

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative inline-flex items-center justify-center overflow-hidden bg-gray-200 rounded-full animate-pulse ${finalSizeClass} ${className}`}>
        <div className="w-1/2 h-1/2 bg-gray-300 rounded-full" />
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600 ${finalSizeClass} ${className}`}>
      {imageUrl && !hasError ? (
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
  );
});
