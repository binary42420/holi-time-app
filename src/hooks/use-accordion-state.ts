"use client"

import { useState, useEffect } from 'react';
import { useUser } from './use-user';

export function useAccordionState(accordionKey: string, defaultValue: string[]) {
  const { user } = useUser();
  const [value, setValue] = useState<string[]>(defaultValue);

  const key = `accordion-state-${user?.id}-${accordionKey}`;

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        setValue(JSON.parse(storedValue));
      }
    } catch (error) {
      console.error("Error reading from localStorage", error);
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}