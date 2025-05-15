/**
 * ESM Compatibility Module
 * 
 * This module handles compatibility between CommonJS and ES Modules.
 * It provides replacements for CommonJS features in an ESM context.
 */

// Create mock modules for CommonJS compatibility
export const createCommonJSModules = () => {
  // Create a simple require function
  const mockRequire = (id: string) => {
    console.warn(`Module "${id}" was imported via CommonJS require() which is not supported in ESM.`);
    return {};
  };
  
  // Add common modules that might be required
  (mockRequire as any).resolve = (id: string) => {
    console.warn(`require.resolve("${id}") was called in ESM context`);
    return id;
  };
  
  (mockRequire as any).cache = {};
  (mockRequire as any).extensions = { '.js': null, '.json': null, '.node': null };
  
  return {
    require: mockRequire,
    module: { exports: {} },
    exports: {},
    __filename: 'mock-filename',
    __dirname: 'mock-dirname',
  };
};

// Helper to dynamically detect CommonJS module usage
export const setupCompatibilityMode = () => {
  if (typeof window !== 'undefined') {
    const commonJSModules = createCommonJSModules();
    
    // Add CommonJS globals to window
    Object.entries(commonJSModules).forEach(([key, value]) => {
      if (!(window as any)[key]) {
        (window as any)[key] = value;
      }
    });
    
    // Add Node.js process object
    if (!(window as any).process) {
      (window as any).process = {
        env: {
          NODE_ENV: import.meta.env?.MODE || 'development',
        },
        nextTick: (fn: Function) => Promise.resolve().then(fn),
        versions: { node: '16.0.0' },
        platform: 'browser',
        cwd: () => '/',
      };
    }
    
    // Add global object
    if (!(window as any).global) {
      (window as any).global = window;
    }
    
    // Add Buffer if needed
    if (!(window as any).Buffer) {
      (window as any).Buffer = {
        isBuffer: () => false,
        from: (data: any) => ({ data }),
      };
    }
  }
};

// Call setup function
setupCompatibilityMode();

// Export CommonJS modules for direct usage
export const commonJS = createCommonJSModules();
export default commonJS;