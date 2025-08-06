"use client";

import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useDataPrefetch from "@/hooks/useDataPrefetch";
import Header from "@/components/Header";
import { LoadingProvider } from "@/providers/loading-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Force dynamic rendering for all pages under this layout
export const dynamic = 'force-dynamic';
export default function AppLayout({ children }: { children: React.ReactNode }) {
  useDataPrefetch();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <LoadingProvider>
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </main>
      </LoadingProvider>
    </div>
  );
}

