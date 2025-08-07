import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers/providers';
import { EnhancedQueryProvider } from '@/providers/enhanced-query-provider';
import HydrationErrorBoundary from '@/components/hydration-error-boundary';
import { LoadingProvider } from '@/providers/loading-provider';
import { TopProgressBar } from '@/components/ui/top-progress-bar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hands On Labor - Mobile Workforce',
  description: 'Mobile-first workforce management for field employees',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hands On Labor',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hands On Labor" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="safe-area-inset-top safe-area-inset-bottom" suppressHydrationWarning>
        <HydrationErrorBoundary>
          <EnhancedQueryProvider>
            <LoadingProvider>
              <TopProgressBar />
              <Providers>{children}</Providers>
            </LoadingProvider>
          </EnhancedQueryProvider>
        </HydrationErrorBoundary>
      </body>
    </html>
  );
}
