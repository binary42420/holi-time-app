"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  Suspense,
  useRef,
  useEffect,
} from "react";
import { LoadingOverlay } from "@/components/ui/enhanced-loading";
import { usePathname, useSearchParams } from "next/navigation";

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  canCancel?: boolean;
  type?: 'page' | 'action' | 'upload' | 'sync';
}

interface LoadingContextType {
  loadingState: LoadingState;
  startLoading: (options?: {
    message?: string;
    progress?: number;
    canCancel?: boolean;
    type?: 'page' | 'action' | 'upload' | 'sync';
  }) => void;
  stopLoading: () => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
  cancelLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

function LoadingProviderContent({ children }: { children: ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  });
  
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const cancelCallbackRef = useRef<(() => void) | null>(null);

  const startLoading = useCallback((options?: {
    message?: string;
    progress?: number;
    canCancel?: boolean;
    type?: 'page' | 'action' | 'upload' | 'sync';
    onCancel?: () => void;
  }) => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Store cancel callback
    cancelCallbackRef.current = options?.onCancel || null;

    setLoadingState({
      isLoading: true,
      message: options?.message || getDefaultMessage(options?.type),
      progress: options?.progress,
      canCancel: options?.canCancel || false,
      type: options?.type || 'page',
    });

    // Auto-stop loading after 30 seconds to prevent stuck states
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('Loading state auto-cleared after 30 seconds');
      stopLoading();
    }, 30000);
  }, []);

  const stopLoading = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    cancelCallbackRef.current = null;
    setLoadingState({ isLoading: false });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress))
    }));
  }, []);

  const updateMessage = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      message
    }));
  }, []);

  const cancelLoading = useCallback(() => {
    if (cancelCallbackRef.current) {
      cancelCallbackRef.current();
    }
    stopLoading();
  }, [stopLoading]);

  // Auto-stop loading on route change
  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams, stopLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const getDefaultMessage = (type?: string) => {
    switch (type) {
      case 'page': return 'Loading page...';
      case 'action': return 'Processing...';
      case 'upload': return 'Uploading...';
      case 'sync': return 'Syncing data...';
      default: return 'Loading...';
    }
  };

  return (
    <LoadingContext.Provider value={{ 
      loadingState, 
      startLoading, 
      stopLoading, 
      updateProgress, 
      updateMessage,
      cancelLoading 
    }}>
      <LoadingOverlay
        isVisible={loadingState.isLoading}
        message={loadingState.message}
        progress={loadingState.progress}
        onCancel={loadingState.canCancel ? cancelLoading : undefined}
      />
      {children}
    </LoadingContext.Provider>
  );
}

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={
      <LoadingOverlay
        isVisible={true}
        message="Initializing application..."
      />
    }>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Suspense>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

// Enhanced loading hook with automatic cleanup
export const useAsyncLoading = () => {
  const { startLoading, stopLoading, updateProgress, updateMessage } = useLoading();
  const activeOperationsRef = useRef(new Set<string>());

  const withLoading = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: {
      message?: string;
      onProgress?: (progress: number) => void;
      operationId?: string;
    }
  ): Promise<T> => {
    const operationId = options?.operationId || Math.random().toString(36);
    
    try {
      activeOperationsRef.current.add(operationId);
      
      startLoading({
        message: options?.message,
        type: 'action',
      });

      // Set up progress callback
      if (options?.onProgress) {
        const progressCallback = (progress: number) => {
          updateProgress(progress);
          options.onProgress?.(progress);
        };
        
        // You can call progressCallback from within your operation
        (operation as any).onProgress = progressCallback;
      }

      const result = await operation();
      return result;
    } finally {
      activeOperationsRef.current.delete(operationId);
      
      // Only stop loading if no other operations are active
      if (activeOperationsRef.current.size === 0) {
        stopLoading();
      }
    }
  }, [startLoading, stopLoading, updateProgress]);

  const withUploadLoading = useCallback(async <T,>(
    uploadOperation: (onProgress: (progress: number) => void) => Promise<T>,
    options?: {
      message?: string;
      operationId?: string;
    }
  ): Promise<T> => {
    const operationId = options?.operationId || Math.random().toString(36);
    
    try {
      activeOperationsRef.current.add(operationId);
      
      startLoading({
        message: options?.message || 'Uploading...',
        type: 'upload',
        progress: 0,
      });

      const result = await uploadOperation((progress) => {
        updateProgress(progress);
      });
      
      return result;
    } finally {
      activeOperationsRef.current.delete(operationId);
      
      if (activeOperationsRef.current.size === 0) {
        stopLoading();
      }
    }
  }, [startLoading, stopLoading, updateProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeOperationsRef.current.clear();
    };
  }, []);

  return {
    withLoading,
    withUploadLoading,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
  };
};