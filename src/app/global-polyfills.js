// Essential polyfills for webpack and Next.js compatibility
(function() {
  'use strict';
  
  if (typeof window !== 'undefined') {
    // Client-side polyfills
    if (typeof global === 'undefined') {
      window.global = window;
    }
    
    // Ensure globalThis is available
    if (typeof globalThis === 'undefined') {
      window.globalThis = window;
    }
    
    console.log('✅ Client-side polyfills loaded successfully');
  } else {
    // Server-side polyfills
    var globalObj = (function() {
      if (typeof globalThis !== 'undefined') return globalThis;
      if (typeof global !== 'undefined') return global;
      return {};
    })();
    
    // Essential webpack globals
    if (typeof globalObj.self === 'undefined') {
      globalObj.self = globalObj;
    }
    
    // Initialize webpack chunk arrays (minimal version)
    if (typeof globalObj.webpackChunk_N_E === 'undefined') {
      globalObj.webpackChunk_N_E = [];
      globalObj.webpackChunk_N_E.push = function(chunk) {
        Array.prototype.push.call(this, chunk);
      };
    }
    
    // Mock webpack require (minimal version)
    if (typeof globalObj.__webpack_require__ === 'undefined') {
      globalObj.__webpack_require__ = function(moduleId) {
        return {};
      };
      globalObj.__webpack_require__.cache = {};
      globalObj.__webpack_require__.modules = {};
    }
    
    console.log('✅ Server-side polyfills loaded successfully');
  }
})();