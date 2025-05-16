import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: ['last 2 versions', 'not dead']
        })
      ]
    }
  },
  define: {
    'global': 'globalThis',
    'process.env': process.env
  },
  server: {
    port: 5175,
    strictPort: false,
    open: true,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@mantine')) {
              return 'mantine-vendor';
            }
            if (id.includes('@tanstack')) {
              return 'query-vendor';
            }
            if (id.includes('d3')) {
              return 'd3-vendor';
            }
            if (id.includes('@tabler/icons-react')) {
              return 'icons-vendor';
            }
            if (id.includes('axios')) {
              return 'api-vendor';
            }
            return 'vendor';
          }
          
          if (id.includes('/components/DeadlockDisplay/')) {
            return 'deadlock-viz';
          }
          if (id.includes('/components/EventTable/')) {
            return 'event-table';
          }
          if (id.includes('/components/EventDetail/')) {
            return 'event-detail';
          }
          if (id.includes('/components/ExplainError/')) {
            return 'explain-error';
          }
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo?.name?.split('.').at(-1) || '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: process.env.NODE_ENV !== 'production',
      format: 'esm',
      target: 'es2020',
      supported: {
        'import-meta': true,
        'dynamic-import': true
      }
    },
    include: [
      'react', 
      'react-dom', 
      '@mantine/core', 
      '@mantine/hooks',
      '@mantine/notifications',
      '@mantine/charts',
      '@tanstack/react-query'
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    mainFields: ['browser', 'module', 'jsnext:main', 'main'],
    alias: {
      '@': '/src',
      '@api': '/src/api',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@store': '/src/store',
      '@assets': '/src/assets',
      // Fix for mantine styles import
      '@mantine/styles': '/src/utils/mantine-compat'
    }
  }
});