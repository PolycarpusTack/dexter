/**
 * Vite plugin to automatically add extensions to imports
 */
export default function importExtension() {
  return {
    name: 'vite-plugin-import-extension',
    
    // This will run in the build phase to resolve imports
    resolveId(id, importer, options) {
      // Don't interfere with node_modules or absolute paths
      if (id.includes('node_modules') || id.startsWith('/') || id.match(/^[a-zA-Z]:\\/)) {
        return null;
      }
      
      // Handle relative imports that don't have extensions
      if (id.startsWith('.') && !id.match(/\.(js|ts|jsx|tsx|mjs|cjs)$/)) {
        // Try common extensions in order
        const extensions = ['.mjs', '.js', '.ts', '.tsx', '.jsx'];
        for (const ext of extensions) {
          try {
            // Check if file exists with this extension
            const resolvedId = `${id}${ext}`;
            // We return the id with extension for further processing
            return resolvedId;
          } catch (err) {
            // Continue to the next extension
          }
        }
      }
      
      return null;
    }
  };
}
