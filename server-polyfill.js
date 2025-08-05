// Server-side polyfills for browser globals
(function() {
  if (typeof global !== 'undefined') {
    // Define self globally so webpack runtime can access it
    if (typeof global.self === 'undefined') {
      global.self = global;
    }
    
    // Also define it as a global variable for direct access
    if (typeof self === 'undefined') {
      global.self = global;
      // Make self available globally
      Object.defineProperty(global, 'self', {
        value: global,
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
    
    // Initialize webpack chunk arrays for server-side rendering
    if (typeof global.webpackChunk_N_E === 'undefined') {
      global.webpackChunk_N_E = [];
      global.self.webpackChunk_N_E = global.webpackChunk_N_E;
    }
    
    // Ensure self also has the webpack chunk array
    if (typeof global.self !== 'undefined' && typeof global.self.webpackChunk_N_E === 'undefined') {
      global.self.webpackChunk_N_E = global.webpackChunk_N_E || [];
    }
    
    if (typeof global.window === 'undefined') {
      global.window = {};
    }
    
    if (typeof global.document === 'undefined') {
      global.document = {};
    }
    
    if (typeof global.navigator === 'undefined') {
      global.navigator = {};
    }
    
    if (typeof global.location === 'undefined') {
      global.location = {};
    }
    
    // Additional webpack runtime polyfills
    if (typeof global.__webpack_require__ === 'undefined') {
      global.__webpack_require__ = function(id) { return {}; };
    }
  }
})();