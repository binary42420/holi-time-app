// Minimal and safe polyfills for Next.js compatibility
'use client';

// Only include essential polyfills that don't interfere with webpack
if (typeof window !== 'undefined') {
  // Ensure globalThis is available for older browsers
  if (typeof globalThis === 'undefined') {
    (window as any).globalThis = window;
  }
  
  // Basic global reference for compatibility
  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }
}