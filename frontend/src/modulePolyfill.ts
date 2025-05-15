/**
 * Module Polyfill for CommonJS/ES Module Compatibility
 * 
 * This file provides polyfills to help with compatibility between CommonJS and ES Modules.
 * It's used to prevent "exports is not defined" and "require is not defined" errors in Vite.
 */

// Create a script to ensure modulePolyfill runs first
const script = document.createElement('script');
script.textContent = `
  // CommonJS compatibility globals
  window.exports = window.exports || {};
  window.module = window.module || { exports: {} };
  window.global = window;
  window.process = window.process || { env: { NODE_ENV: 'development' } };
  
  // Create a simple require function that does not actually load modules
  // but prevents "require is not defined" errors
  window.require = function(id) {
    console.warn("Module \\"" + id + "\\" was required through CommonJS 'require' which is not supported in ESM.");
    return {}; // Return empty module
  };
`;

// Append to document head to ensure it runs before other scripts
if (typeof document !== 'undefined') {
  document.head.appendChild(script);
}

// Also set up the polyfills directly in case the script hasn't executed yet
if (typeof window !== 'undefined') {
  // Only run in browser environment
  (window as any).exports = (window as any).exports || {};
  (window as any).module = (window as any).module || { exports: {} };
  (window as any).global = window; // Add global object reference
  (window as any).process = (window as any).process || { env: { NODE_ENV: 'development' } };
  (window as any).require = (window as any).require || function(id: string) {
    console.warn(`Module "${id}" was required through CommonJS 'require' which is not supported in ESM.`);
    return {}; // Return empty module
  };
}

export {};
