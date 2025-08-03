import Image from 'next/image';
import { getCompanyInitials } from "@/lib/utils";

interface CompanyAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
}

export function CompanyAvatar({ src, name, className }: CompanyAvatarProps) {
  // If className contains size classes (w-* h-*), use those instead of default w-10 h-10
  const hasCustomSize = className && (className.includes('w-') || className.includes('h-'));
  const defaultSize = hasCustomSize ? '' : 'w-10 h-10';
  
  return (
    <div className={`relative inline-flex items-center justify-center ${defaultSize} overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">{getCompanyInitials(name)}</span>
      )}
    </div>
  );
}