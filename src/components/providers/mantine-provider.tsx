'use client';

import { useTheme } from 'next-themes';
import {
  MantineProvider as BaseMantineProvider,
  createTheme,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import React from 'react';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  },
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
      '#0c5aa6',
    ],
  },
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
});

interface MantineProviderProps {
  children: React.ReactNode;
}

export function MantineProvider({ children }: MantineProviderProps) {
  const { theme: colorScheme } = useTheme();

  return (
    <BaseMantineProvider theme={theme} forceColorScheme={colorScheme === 'dark' ? 'dark' : 'light'}>
      <Notifications position="top-right" />
      {children}
    </BaseMantineProvider>
  );
}
