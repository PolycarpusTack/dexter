import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer'; // You may need to install this

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
    sourcemap: true
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  }
});
