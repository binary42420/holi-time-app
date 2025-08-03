/**
 * Cookie Cleanup Utility
 * Helps manage and clean up large cookies that can cause 431 errors
 */

export interface CookieInfo {
  name: string;
  value: string;
  size: number;
  domain: string;
  path: string;
}

/**
 * Get all cookies with their sizes
 */
export function getAllCookies(): CookieInfo[] {
  if (typeof document === 'undefined') return [];
  
  const cookies: CookieInfo[] = [];
  const cookieString = document.cookie;
  
  if (!cookieString) return cookies;
  
  const cookiePairs = cookieString.split(';');
  
  cookiePairs.forEach(pair => {
    const [name, ...valueParts] = pair.trim().split('=');
    const value = valueParts.join('=');
    
    if (name && value) {
      cookies.push({
        name: name.trim(),
        value: value.trim(),
        size: (name + value).length,
        domain: window.location.hostname,
        path: '/'
      });
    }
  });
  
  return cookies.sort((a, b) => b.size - a.size);
}

/**
 * Get large cookies (over specified size)
 */
export function getLargeCookies(maxSize: number = 1024): CookieInfo[] {
  return getAllCookies().filter(cookie => cookie.size > maxSize);
}

/**
 * Calculate total cookie size
 */
export function getTotalCookieSize(): number {
  return getAllCookies().reduce((total, cookie) => total + cookie.size, 0);
}

/**
 * Delete a specific cookie
 */
export function deleteCookie(name: string, domain?: string, path?: string): void {
  if (typeof document === 'undefined') return;
  
  const cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path || '/'}${domain ? `; domain=${domain}` : ''}`;
  document.cookie = cookieString;
}

/**
 * Delete all cookies for the current domain
 */
export function deleteAllCookies(): void {
  const cookies = getAllCookies();
  cookies.forEach(cookie => {
    deleteCookie(cookie.name, cookie.domain, cookie.path);
  });
}

/**
 * Delete large cookies only
 */
export function deleteLargeCookies(maxSize: number = 1024): void {
  const largeCookies = getLargeCookies(maxSize);
  largeCookies.forEach(cookie => {
    deleteCookie(cookie.name, cookie.domain, cookie.path);
  });
}

/**
 * Check if cookies are causing header size issues
 */
export function checkCookieHealth(): {
  totalSize: number;
  cookieCount: number;
  largeCookies: CookieInfo[];
  isHealthy: boolean;
  recommendations: string[];
} {
  const cookies = getAllCookies();
  const totalSize = getTotalCookieSize();
  const largeCookies = getLargeCookies(1024);
  const recommendations: string[] = [];
  
  let isHealthy = true;
  
  // Check total size (8KB is typical limit)
  if (totalSize > 6144) { // 6KB warning threshold
    isHealthy = false;
    recommendations.push(`Total cookie size (${Math.round(totalSize/1024)}KB) is approaching limits`);
  }
  
  // Check individual cookie sizes
  if (largeCookies.length > 0) {
    isHealthy = false;
    recommendations.push(`${largeCookies.length} cookies are over 1KB in size`);
  }
  
  // Check cookie count
  if (cookies.length > 20) {
    recommendations.push(`High cookie count (${cookies.length}) may impact performance`);
  }
  
  if (isHealthy) {
    recommendations.push('Cookie health looks good!');
  }
  
  return {
    totalSize,
    cookieCount: cookies.length,
    largeCookies,
    isHealthy,
    recommendations
  };
}

/**
 * Auto-cleanup cookies if they're causing issues
 */
export function autoCleanupCookies(): boolean {
  const health = checkCookieHealth();
  
  if (!health.isHealthy) {
    console.warn('Cookie health issues detected, performing cleanup...');
    
    // Delete cookies over 2KB
    deleteLargeCookies(2048);
    
    // Check again
    const newHealth = checkCookieHealth();
    
    if (newHealth.totalSize < health.totalSize) {
      console.log(`Cookie cleanup successful. Size reduced from ${Math.round(health.totalSize/1024)}KB to ${Math.round(newHealth.totalSize/1024)}KB`);
      return true;
    }
  }
  
  return false;
}

/**
 * Monitor cookie size and warn if approaching limits
 */
export function startCookieMonitoring(): void {
  if (typeof window === 'undefined') return;
  
  const checkInterval = 30000; // 30 seconds
  
  setInterval(() => {
    const health = checkCookieHealth();
    
    if (!health.isHealthy) {
      console.warn('Cookie Health Warning:', health.recommendations);
      
      // Auto-cleanup if total size is over 7KB
      if (health.totalSize > 7168) {
        autoCleanupCookies();
      }
    }
  }, checkInterval);
}

/**
 * Emergency cookie cleanup for 431 errors
 */
export function emergencyCookieCleanup(): void {
  console.log('🚨 Emergency cookie cleanup initiated...');
  
  // Clear all localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Cleared localStorage and sessionStorage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
  
  // Delete all cookies
  deleteAllCookies();
  console.log('✅ Deleted all cookies');
  
  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
      console.log('✅ Cleared browser caches');
    });
  }
  
  console.log('🎉 Emergency cleanup complete. Please refresh the page.');
}

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Start monitoring after page load
  window.addEventListener('load', () => {
    setTimeout(startCookieMonitoring, 5000);
  });
  
  // Add global emergency cleanup function
  (window as any).emergencyCookieCleanup = emergencyCookieCleanup;
}
