// Universal runtime polyfills for Node.js, Edge Runtime, and Browser environments
// This file ensures 'global' is available in all contexts

// Define global polyfill immediately
(() => {
  'use strict';
  
  // Check if we need to polyfill global
  if (typeof global === 'undefined') {
    // Determine the global object based on environment
    let globalObject: any;
    
    if (typeof globalThis !== 'undefined') {
      globalObject = globalThis;
    } else if (typeof window !== 'undefined') {
      globalObject = window;
    } else if (typeof self !== 'undefined') {
      globalObject = self;
    } else {
      // Create a minimal global object as last resort
      globalObject = {};
    }
    
    // Define global on the determined global object
    try {
      Object.defineProperty(globalObject, 'global', {
        value: globalObject,
        writable: true,
        enumerable: false,
        configurable: true
      });
    } catch (e) {
      // Fallback if defineProperty fails
      (globalObject as any).global = globalObject;
    }
    
    // Also ensure globalThis is available
    if (typeof globalThis === 'undefined') {
      try {
        Object.defineProperty(globalObject, 'globalThis', {
          value: globalObject,
          writable: true,
          enumerable: false,
          configurable: true
        });
      } catch (e) {
        (globalObject as any).globalThis = globalObject;
      }
    }
  }
  
  // Additional Edge Runtime specific polyfills
  if (typeof window === 'undefined' && typeof self !== 'undefined') {
    // We're likely in Edge Runtime
    if (typeof (global as any).process === 'undefined') {
      (global as any).process = {
        env: {},
        platform: 'edge',
        version: 'edge-runtime',
        versions: { node: 'edge-runtime' }
      };
    }
  }
})();

export {};