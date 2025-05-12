/**
 * Module Polyfill for CommonJS/ES Module Compatibility
 * 
 * This file provides polyfills to help with compatibility between CommonJS and ES Modules.
 * It's used to prevent "exports is not defined" errors in Vite.
 */

// Polyfill for CommonJS compatibility in ES Module environment
if (typeof window !== 'undefined') {
  // Only run in browser environment
  window.exports = window.exports || {};
  window.module = window.module || { exports: {} };
  window.require = window.require || ((id: string) => {
    console.warn(`Module "${id}" was required through CommonJS 'require' which is not supported in ESM.`);
    return {}; // Return empty module
  });
}

export {};
