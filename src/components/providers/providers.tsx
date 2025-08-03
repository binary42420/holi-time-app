'use client';

import React from 'react';
import NextAuthSessionProvider from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { MantineProvider } from '@/components/providers/mantine-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <MantineProvider>{children}</MantineProvider>
      </ThemeProvider>
    </NextAuthSessionProvider>
  );
}
