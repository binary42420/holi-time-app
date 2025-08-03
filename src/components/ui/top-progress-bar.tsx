"use client";

import { useEffect, useState } from 'react';
import { useLoading } from '@/providers/loading-provider';

export const TopProgressBar = () => {
  const { isLoading } = useLoading();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (isLoading) {
      setIsVisible(true);
      setProgress(0);
      timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress < 90) {
            return oldProgress + Math.random() * 5; // Simulate progress
          }
          return oldProgress;
        });
      }, 100);
    } else {
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 500); // Fade out after completion
    }

    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 bg-indigo-500 z-[9999] transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ width: `${progress}%` }}
    />
  );
};