'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from "lucide-react";
import { 
  getTotalCookieSize, 
  checkCookieHealth, 
  emergencyCookieCleanup,
  autoCleanupCookies 
} from '@/lib/cookie-cleanup';

interface CookieMonitorProps {
  onCleanup?: () => void;
}

export function CookieMonitor({ onCleanup }: CookieMonitorProps) {
  const [cookieHealth, setCookieHealth] = useState<{
    isHealthy: boolean;
    totalSize: number;
    warningLevel: 'none' | 'warning' | 'critical';
  }>({ isHealthy: true, totalSize: 0, warningLevel: 'none' });
  
  const [isMonitoring, setIsMonitoring] = useState(true);

  const checkHealth = () => {
    if (typeof window === 'undefined') return;
    
    const health = checkCookieHealth();
    const totalSize = getTotalCookieSize();
    
    let warningLevel: 'none' | 'warning' | 'critical' = 'none';
    
    if (totalSize > 3072) { // 3KB
      warningLevel = 'critical';
    } else if (totalSize > 2048) { // 2KB
      warningLevel = 'warning';
    }
    
    setCookieHealth({
      isHealthy: health.isHealthy,
      totalSize,
      warningLevel
    });
  };

  const handleEmergencyCleanup = () => {
    emergencyCookieCleanup();
    onCleanup?.();
    // Refresh the page after cleanup
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleAutoCleanup = () => {
    const success = autoCleanupCookies();
    if (success) {
      checkHealth();
      onCleanup?.();
    }
  };

  useEffect(() => {
    if (!isMonitoring) return;

    // Initial check
    checkHealth();

    // Monitor cookie size every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    // Auto-cleanup if cookies get too large
    const cleanupInterval = setInterval(() => {
      const totalSize = getTotalCookieSize();
      if (totalSize > 3072) { // 3KB threshold
        console.warn('Cookie size exceeded 3KB, performing auto-cleanup');
        autoCleanupCookies();
        checkHealth();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [isMonitoring]);

  // Don't render if cookies are healthy
  if (cookieHealth.warningLevel === 'none') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant={cookieHealth.warningLevel === 'critical' ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <div>
            <strong>Cookie Size Warning</strong>
            <p className="text-sm">
              Current size: {Math.round(cookieHealth.totalSize / 1024 * 100) / 100}KB
              {cookieHealth.warningLevel === 'critical' && ' (Critical - may cause 431 errors)'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleAutoCleanup}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Auto Clean
            </Button>
            
            {cookieHealth.warningLevel === 'critical' && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleEmergencyCleanup}
              >
                Emergency Clean
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsMonitoring(false)}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default CookieMonitor;
