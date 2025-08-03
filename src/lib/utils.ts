import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name || name.trim() === '') return 'U';
  
  const words = name.trim().split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return 'U';
  
  if (words.length === 1) {
    // Single word: take first 2 characters
    return words[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple words: take first letter of first and last word
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  
  return words[0].substring(0, 2).toUpperCase();
}

export function getCompanyInitials(name: string) {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
