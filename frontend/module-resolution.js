/**
 * Build-time helper to resolve TypeScript modules.
 * This file gets imported by the Vite build to help resolve module paths.
 */

// Export a dummy function to avoid unused file warnings
export function configureModuleResolution() {
  return {
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      alias: {
        '@': '/src',
        '@api': '/src/api',
        '@components': '/src/components',
        '@utils': '/src/utils',
        '@store': '/src/store',
        '@assets': '/src/assets'
      }
    }
  };
}