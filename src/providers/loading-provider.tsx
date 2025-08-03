"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  Suspense,
} from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

function LoadingProviderContent({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    stopLoading(); // Stop loading on route change
  }, [pathname, searchParams, stopLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <LoadingSpinner className="h-12 w-12 text-white" />
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <LoadingSpinner className="h-12 w-12 text-white" />
      </div>
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