// Universal global polyfill for webpack ProvidePlugin
// This provides a consistent global object across all environments

const getGlobalObject = () => {
  if (typeof global !== 'undefined') return global;
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  return {};
};

const globalObject = getGlobalObject();

// Ensure global is defined on the global object itself
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

// Export the global object
export default globalObject;