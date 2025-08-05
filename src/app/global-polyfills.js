// Global polyfills for both server-side and client-side rendering
// Must be loaded before any other code

(function() {
  'use strict';
  
  // CLIENT-SIDE POLYFILLS
  if (typeof window !== 'undefined') {
    // Browser environment - add client-side polyfills
    if (typeof global === 'undefined') {
      if (typeof globalThis !== 'undefined') {
        globalThis.global = globalThis;
      } else if (typeof window !== 'undefined') {
        window.global = window;
      } else if (typeof self !== 'undefined') {
        self.global = self;
      }
    }
    
    // Ensure globalThis is available in older browsers
    if (typeof globalThis === 'undefined') {
      if (typeof window !== 'undefined') {
        window.globalThis = window;
      } else if (typeof self !== 'undefined') {
        self.globalThis = self;
      }
    }
    
    console.log('✅ Client-side polyfills loaded successfully');
    return; // Exit early for client-side
  }
  
  // SERVER-SIDE POLYFILLS BELOW

  // Safely get global object
  var globalObj;
  try {
    globalObj = (function() {
      if (typeof globalThis !== 'undefined') return globalThis;
      if (typeof global !== 'undefined') return global;
      return null;
    })();
  } catch (e) {
    return; // Exit if we can't access global objects
  }

  // Ensure global exists and we're in server environment
  if (!globalObj || typeof globalObj !== 'object') {
    return;
  }

  // Define self as global for webpack runtime
  if (typeof globalObj.self === 'undefined') {
    globalObj.self = globalObj;
  }

  // Define globalThis.self as well
  if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
    globalThis.self = globalObj;
  }

  // Initialize webpack chunk loading arrays with comprehensive names
  const chunkArrayNames = [
    'webpackChunk_N_E',
    'webpackJsonp', 
    '__webpack_chunks__',
    'webpackChunk', 
    '__NEXT_P'
  ];

  chunkArrayNames.forEach(function(chunkName) {
    // Initialize on global
    if (typeof globalObj[chunkName] === 'undefined') {
      globalObj[chunkName] = [];
      
      // Add push method for webpack compatibility
      globalObj[chunkName].push = function(chunk) {
        // Server-side mock - just store the chunk
        Array.prototype.push.call(this, chunk);
      };
    }

    // Initialize on globalObj.self
    if (globalObj.self && typeof globalObj.self[chunkName] === 'undefined') {
      globalObj.self[chunkName] = globalObj[chunkName];
    }

    // Initialize on globalThis
    if (typeof globalThis !== 'undefined' && typeof globalThis[chunkName] === 'undefined') {
      globalThis[chunkName] = globalObj[chunkName];
    }
  });

  // Mock webpack require function
  if (typeof globalObj.__webpack_require__ === 'undefined') {
    globalObj.__webpack_require__ = function(moduleId) {
      console.warn('Server-side __webpack_require__ called with:', moduleId);
      return {};
    };
    
    // Add common webpack require properties
    globalObj.__webpack_require__.cache = {};
    globalObj.__webpack_require__.modules = {};
  }

  // Mock webpack public path
  if (typeof globalObj.__webpack_public_path__ === 'undefined') {
    globalObj.__webpack_public_path__ = '/_next/';
  }

  // Additional browser globals for SSR compatibility
  if (typeof globalObj.window === 'undefined') {
    globalObj.window = {
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; },
      location: { href: '', pathname: '/', search: '', hash: '' },
      history: { pushState: function() {}, replaceState: function() {} },
      localStorage: {
        getItem: function() { return null; },
        setItem: function() {},
        removeItem: function() {},
        clear: function() {}
      },
      sessionStorage: {
        getItem: function() { return null; },
        setItem: function() {},
        removeItem: function() {},
        clear: function() {}
      }
    };
  }

  if (typeof globalObj.document === 'undefined') {
    globalObj.document = {
      createElement: function(tag) { 
        return {
          style: {},
          setAttribute: function() {},
          getAttribute: function() { return null; },
          appendChild: function() {},
          removeChild: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          innerHTML: '',
          textContent: '',
          nodeType: 1,
          nodeName: tag ? tag.toUpperCase() : 'DIV'
        }; 
      },
      createTextNode: function(text) {
        return {
          nodeType: 3,
          nodeName: '#text',
          textContent: text || '',
          data: text || ''
        };
      },
      createDocumentFragment: function() {
        return {
          nodeType: 11,
          nodeName: '#document-fragment',
          appendChild: function() {},
          removeChild: function() {},
          childNodes: []
        };
      },
      getElementsByTagName: function() { return []; },
      getElementById: function() { return null; },
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; },
      addEventListener: function() {},
      removeEventListener: function() {},
      head: { 
        appendChild: function() {},
        removeChild: function() {}
      },
      body: { 
        appendChild: function() {},
        removeChild: function() {}
      },
      documentElement: {
        style: {},
        appendChild: function() {},
        removeChild: function() {}
      }
    };
  }

  if (typeof globalObj.navigator === 'undefined') {
    globalObj.navigator = {
      userAgent: 'Mozilla/5.0 (Server Side Rendering)',
      language: 'en-US',
      languages: ['en-US'],
      platform: 'Server'
    };
  }

  if (typeof globalObj.location === 'undefined') {
    globalObj.location = {
      href: '',
      origin: '',
      protocol: 'https:',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
      assign: function() {},
      replace: function() {},
      reload: function() {}
    };
  }

  // Ensure document is available globally (not just on globalObj.document)
  if (typeof document === 'undefined' && typeof globalObj.document !== 'undefined') {
    // Make document available in global scope
    globalThis.document = globalObj.document;
  }

  // Additional polyfills for common browser APIs
  if (typeof globalObj.console === 'undefined') {
    globalObj.console = {
      log: function() {},
      warn: function() {},
      error: function() {},
      info: function() {},
      debug: function() {}
    };
  }

  console.log('✅ Server-side polyfills loaded successfully');
})();