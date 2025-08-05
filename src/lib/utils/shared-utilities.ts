// Shared utility functions for common operations

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Enhanced className utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export const dateUtils = {
  // Format date for display
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    });
  },

  // Format time for display
  formatTime: (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  },

  // Format date and time
  formatDateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${dateUtils.formatDate(d)} ${dateUtils.formatTime(d)}`;
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return dateUtils.formatDate(d);
  },

  // Check if date is today
  isToday: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  // Check if date is this week
  isThisWeek: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= startOfWeek && d < endOfWeek;
  },

  // Add days to date
  addDays: (date: Date | string, days: number): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },

  // Get start of day
  startOfDay: (date: Date | string): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  // Get end of day
  endOfDay: (date: Date | string): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  },
};

// String utilities
export const stringUtils = {
  // Capitalize first letter
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Convert to title case
  toTitleCase: (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Convert camelCase to readable text
  camelToReadable: (str: string): string => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  },

  // Truncate string with ellipsis
  truncate: (str: string, length: number, suffix = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  // Generate initials from name
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },

  // Slugify string for URLs
  slugify: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // Remove HTML tags
  stripHtml: (str: string): string => {
    return str.replace(/<[^>]*>/g, '');
  },

  // Escape HTML
  escapeHtml: (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Number utilities
export const numberUtils = {
  // Format currency
  formatCurrency: (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  // Format percentage
  formatPercentage: (value: number, decimals = 1): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  // Format large numbers (1K, 1M, etc.)
  formatCompact: (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  },

  // Round to decimal places
  round: (num: number, decimals = 2): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  // Clamp number between min and max
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },

  // Generate random number between min and max
  random: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Check if number is in range
  inRange: (num: number, min: number, max: number): boolean => {
    return num >= min && num <= max;
  },
};

// Array utilities
export const arrayUtils = {
  // Remove duplicates
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  },

  // Remove duplicates by key
  uniqueBy: <T>(arr: T[], key: keyof T): T[] => {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  // Group array by key
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = groups[value] || [];
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  // Sort array by key
  sortBy: <T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
  },

  // Chunk array into smaller arrays
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  // Shuffle array
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Get random item from array
  sample: <T>(arr: T[]): T | undefined => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Get multiple random items
  sampleSize: <T>(arr: T[], size: number): T[] => {
    const shuffled = arrayUtils.shuffle(arr);
    return shuffled.slice(0, size);
  },
};

// Object utilities
export const objectUtils = {
  // Deep clone object
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => objectUtils.deepClone(item)) as unknown as T;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = objectUtils.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  // Pick specific keys from object
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  // Omit specific keys from object
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },

  // Check if object is empty
  isEmpty: (obj: object): boolean => {
    return Object.keys(obj).length === 0;
  },

  // Get nested value safely
  get: (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  },

  // Set nested value
  set: (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  },
};

// URL utilities
export const urlUtils = {
  // Build query string from object
  buildQuery: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    return searchParams.toString();
  },

  // Parse query string to object
  parseQuery: (queryString: string): Record<string, string> => {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  },

  // Join URL parts
  joinUrl: (...parts: string[]): string => {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  },

  // Check if URL is absolute
  isAbsolute: (url: string): boolean => {
    return /^https?:\/\//.test(url);
  },
};

// Validation utilities
export const validationUtils = {
  // Email validation
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation (basic)
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  // URL validation
  isUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // UUID validation
  isUuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Strong password validation
  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },
};

// Performance utilities
export const performanceUtils = {
  // Debounce function
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize function
  memoize: <T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map();
    
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Measure execution time
  measureTime: async <T>(
    func: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await func();
    const duration = performance.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  },
};

// Storage utilities
export const storageUtils = {
  // Local storage with JSON support
  local: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      if (typeof window === 'undefined') return defaultValue || null;
      
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch {
        return defaultValue || null;
      }
    },
    
    set: (key: string, value: any): void => {
      if (typeof window === 'undefined') return;
      
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    },
    
    remove: (key: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    },
    
    clear: (): void => {
      if (typeof window === 'undefined') return;
      localStorage.clear();
    },
  },

  // Session storage with JSON support
  session: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      if (typeof window === 'undefined') return defaultValue || null;
      
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch {
        return defaultValue || null;
      }
    },
    
    set: (key: string, value: any): void => {
      if (typeof window === 'undefined') return;
      
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to save to sessionStorage:', error);
      }
    },
    
    remove: (key: string): void => {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(key);
    },
    
    clear: (): void => {
      if (typeof window === 'undefined') return;
      sessionStorage.clear();
    },
  },
};

// Export all utilities as a single object for convenience
export const utils = {
  date: dateUtils,
  string: stringUtils,
  number: numberUtils,
  array: arrayUtils,
  object: objectUtils,
  url: urlUtils,
  validation: validationUtils,
  performance: performanceUtils,
  storage: storageUtils,
};