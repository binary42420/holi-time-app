import Image from 'next/image';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { getInitials } from "@/lib/utils";
import { avatarApi } from "@/lib/api-client";

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
  const [imageUrl, setImageUrl] = useState<string | null>(src);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [cacheKey, setCacheKey] = useState<string>('');

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setImageUrl(null);
    onLoadError?.();
  }, [onLoadError]);

  // Fetch avatar with smart caching
  const fetchAvatar = useCallback(async () => {
    if (!userId || !enableSmartCaching) return;

    try {
      setIsLoading(true);

      // Try to get cached avatar first
      const avatarData = await avatarApi.getUserAvatar(userId, {
        revalidate: false
      });

      if (avatarData && avatarData.url) {
        // Add cache busting parameter
        const url = new URL(avatarData.url, window.location.origin);
        url.searchParams.set('t', Date.now().toString());

        setImageUrl(url.toString());
        setCacheKey(Date.now().toString());
        setHasError(false);
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
      setHasError(true);
      setImageUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enableSmartCaching]);

  // Listen for avatar updates
  useEffect(() => {
    if (!userId) return;

    const handleAvatarUpdate = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        if (event.detail.deleted) {
          setImageUrl(null);
          setHasError(false);
        } else {
          fetchAvatar();
        }
      }
    };

    const handleCacheInvalidation = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        fetchAvatar();
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as any);
    window.addEventListener('avatarCacheInvalidated', handleCacheInvalidation as any);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as any);
      window.removeEventListener('avatarCacheInvalidated', handleCacheInvalidation as any);
    };
  }, [userId, fetchAvatar]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    if (userId) {
      // Always use the unified avatar API endpoint when userId is available
      // This ensures consistency regardless of src value
      const avatarUrl = `/api/users/${userId}/avatar/image?t=${Date.now()}`;
      setImageUrl(avatarUrl);
      setIsLoading(false);
      
      // If smart caching is enabled, also try to fetch avatar data
      if (enableSmartCaching) {
        fetchAvatar();
      }
    } else if (src) {
      // Only use src if no userId is provided (for external/legacy usage)
      if (src.includes('/avatar/image')) {
        // Add cache busting for our avatar API
        const url = new URL(src, window.location.origin);
        url.searchParams.set('t', Date.now().toString());
        setImageUrl(url.toString());
      } else {
        // Use src as-is (external URLs, data URLs, etc.)
        setImageUrl(src);
      }
      setIsLoading(false);
    } else {
      // No src and no userId - show initials only
      setIsLoading(false);
      setImageUrl(null);
      setHasError(false);
    }
  }, [src, userId, enableSmartCaching]);

  // Listen for global avatar updates
  useEffect(() => {
    if (!userId) return;

    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId: updatedUserId, deleted } = event.detail;

      if (updatedUserId === userId) {
        console.log(`Avatar updated for user ${userId}, refreshing...`);

        if (deleted) {
          // Avatar was deleted, clear the image
          setImageUrl(null);
          setHasError(false);
        } else {
          // Avatar was updated, fetch fresh version
          if (enableSmartCaching) {
            fetchAvatar();
          } else {
            // Force refresh with cache busting
            const freshUrl = avatarApi.getAvatarUrl(userId, Date.now());
            setImageUrl(freshUrl);
          }
        }

        setCacheKey(Date.now().toString());
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as any);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as any);
    };
  }, [userId, enableSmartCaching, fetchAvatar]);

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
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">
          {initials}
        </span>
      )}
    </div>
  );
});