import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add TypeScript with Babel
      babel: {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
        ],
        plugins: [
          ["@babel/plugin-transform-typescript", { 
            allowDeclareFields: true,
            isTSX: true,
            allExtensions: true
          }],
          "@babel/plugin-transform-react-jsx"
        ]
      }
    })
  ],
  esbuild: {
    // Enable JSX in .js files
    jsx: 'automatic',
    jsxImportSource: 'react',
    // Handle TypeScript
    include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
  },
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
  define: {
    // Fix for "exports is not defined" error
    'global': 'window',
    'process.env': process.env
  },
  server: {
    port: 5175,
    strictPort: false, // Allow fallback to other ports
    open: true,
    host: true // Listen on all addresses
  },
  build: {
    outDir: 'dist',
    // Only generate source maps in development mode
    sourcemap: process.env.NODE_ENV !== 'production',
    // Chunk size optimization
    chunkSizeWarningLimit: 1000, // Increase warning threshold to 1MB
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          // Vendor chunks
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
            return 'vendor'; // all other vendor packages
          }
          
          // Component chunks
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
          // Organize assets into folders
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
    // Enable minification & tree shaking
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
      // Improve sourcemap generation during development
      sourcemap: process.env.NODE_ENV !== 'production',
      // Ensure proper handling of CommonJS modules
      format: 'esm',
      target: 'es2020',
      supported: {
        'import-meta': true,
        'dynamic-import': true
      }
    },
    include: ['react', 'react-dom'] // Force pre-bundling of React
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // Ensure proper resolution of CommonJS and ESM modules
    mainFields: ['module', 'browser', 'main']
  }
});
