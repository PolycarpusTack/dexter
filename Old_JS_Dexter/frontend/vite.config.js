import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        // Add autoprefixer for vendor prefixing
        autoprefixer({
          // Target last 2 versions of browsers and not dead browsers
          overrideBrowserslist: ['last 2 versions', 'not dead']
        })
      ]
    }
  },
  server: {
    port: 5175,
    strictPort: true,
    open: true
  },
  build: {
    outDir: 'dist',
    // Only generate source maps in development mode
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Improve sourcemap generation during development
      sourcemap: process.env.NODE_ENV !== 'production',
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
});
