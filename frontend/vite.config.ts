/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    // Disable source maps for esbuild to avoid JSON parse errors
    sourcemap: false
  },
  css: {
    // Disable CSS source maps in dev to avoid noisy parse errors in some browsers
    devSourcemap: false,
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
    // Avoid injecting the entire process.env (can crash esbuild).
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  server: {
    port: 5175,
    strictPort: false,
    open: true,
    // Bind to localhost to avoid odd WS host/IPs in some environments (WSL/Windows)
    host: 'localhost',
    // Help HMR connect reliably when ports/IPs are tricky
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: process.env.HMR_CLIENT_PORT
        ? Number(process.env.HMR_CLIENT_PORT)
        : undefined,
    },
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 500, // Stricter limit to catch bloat early
    rollupOptions: {
      onwarn(warning, warn) {
        // Fail build on specific warnings in CI/production
        if (process.env.CI && ['UNUSED_EXTERNAL_IMPORT', 'CIRCULAR_DEPENDENCY'].includes(warning.code || '')) {
          throw new Error(warning.message);
        }
        warn(warning);
      },
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
      // Disable prebundle sourcemaps to avoid JSON.parse errors in DevTools when paths mismatch
      sourcemap: false,
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
      '@tanstack/react-query',
      'recharts'
    ],
    // Exclude problematic packages that cause source map issues
    exclude: ['installHook']
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
