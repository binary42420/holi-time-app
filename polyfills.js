// Universal global polyfill for webpack ProvidePlugin
// This module provides the global object for all environments

// Define the global object based on the environment

if (typeof global !== 'undefined') {
  // Node.js environment
  globalObject = global;
} else if (typeof globalThis !== 'undefined') {
  // Modern browsers/environments
  globalObject = globalThis;
} else if (typeof self !== 'undefined') {
  // Web Workers/Service Workers
  globalObject = self;
} else if (typeof window !== 'undefined') {
  // Browser environment
  globalObject = window;
} else {
  // Fallback
  globalObject = {};
}

// Ensure global property exists on the global object
if (typeof globalObject.global === 'undefined') {
  try {
    Object.defineProperty(globalObject, 'global', {
      value: globalObject,
      writable: true,
      enumerable: false,
      configurable: true
    });
  } catch (e) {
    globalObject.global = globalObject;
  }
}

// Additional server-side polyfills if we're in Node.js
if (typeof global !== 'undefined' && typeof window === 'undefined') {
  if (typeof global.self === 'undefined') {
    global.self = global;
  }
  if (typeof global.window === 'undefined') {
    global.window = {};
  }
  if (typeof global.document === 'undefined') {
    global.document = {};
  }
}

// Export the global object for webpack ProvidePlugin
module.exports = globalObject;