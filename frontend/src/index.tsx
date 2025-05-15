// File: frontend/src/index.tsx

// Import ESM compatibility helpers FIRST
import './esm-compat';
// Import module polyfill to fix "exports is not defined" error
import './modulePolyfill';
// Import JSX runtime fix to handle JSX in TypeScript files
import './fix-jsx-runtime';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import dexterTheme from './theme/theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

// Create a QueryClient with proper error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for React Query
      retry: 1, // Retry failed requests just once
      refetchOnWindowFocus: true, // Auto-refresh when tab gets focus
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Garbage collection after 30 minutes
    },
    mutations: {
      // Global defaults for mutations
      retry: 0,
    },
  },
});

// Set up global error handling separately if needed
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'observerResultsUpdated' && event.query.state.status === 'error') {
    console.error('React Query Error:', event.query.state.error);
    // Error notifications are handled at the component level
  }
});

// Get the root element and check if it exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Mount the app
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MantineProvider 
      theme={dexterTheme} 
      defaultColorScheme="light"
    >
      <Notifications position="top-right" zIndex={1000} />
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);

// Do not export App again since this is an entry point
// Just render the app to the DOM
