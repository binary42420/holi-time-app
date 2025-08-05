// Server-side polyfills for webpack and browser globals
// This file must be imported early in the server-side rendering process

// Comprehensive webpack runtime polyfills
if (typeof global !== 'undefined') {
  // Define self globally so webpack runtime can access it
  if (typeof (global as any).self === 'undefined') {
    (global as any).self = global;
  }

  // Define globalThis.self as well
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).self === 'undefined') {
    (globalThis as any).self = global;
  }

  // Initialize all possible webpack chunk arrays for server-side rendering
  const chunkNames = ['webpackChunk_N_E', 'webpackJsonp', '__webpack_chunks__'];
  chunkNames.forEach(chunkName => {
    if (typeof (global as any)[chunkName] === 'undefined') {
      (global as any)[chunkName] = [];
    }
    
    // Ensure self also has the webpack chunk array
    if (typeof (global as any).self !== 'undefined' && typeof (global as any).self[chunkName] === 'undefined') {
      (global as any).self[chunkName] = (global as any)[chunkName];
    }
    
    // Also ensure globalThis has it
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any)[chunkName] === 'undefined') {
      (globalThis as any)[chunkName] = (global as any)[chunkName];
    }
  });

  // Additional browser globals for SSR compatibility
  if (typeof (global as any).window === 'undefined') {
    (global as any).window = {};
  }

  if (typeof (global as any).document === 'undefined') {
    (global as any).document = {
      createElement: () => ({}),
      getElementsByTagName: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  if (typeof (global as any).navigator === 'undefined') {
    (global as any).navigator = {
      userAgent: 'Mozilla/5.0 (Server Side Rendering)',
    };
  }

  if (typeof (global as any).location === 'undefined') {
    (global as any).location = {
      href: '',
      origin: '',
      protocol: 'https:',
      hostname: '',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    };
  }

  // Webpack runtime polyfills
  if (typeof (global as any).__webpack_require__ === 'undefined') {
    (global as any).__webpack_require__ = function(id: string) { 
      console.warn(`Server-side __webpack_require__ called with id: ${id}`);
      return {}; 
    };
  }

  // Additional webpack globals that might be accessed
  if (typeof (global as any).__webpack_public_path__ === 'undefined') {
    (global as any).__webpack_public_path__ = '/_next/';
  }
}

// Ensure polyfills are available immediately
if (typeof self === 'undefined' && typeof global !== 'undefined') {
  (globalThis as any).self = global;
}

export {}; // Make this a module