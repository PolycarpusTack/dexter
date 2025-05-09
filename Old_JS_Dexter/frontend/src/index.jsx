// File: frontend/src/index.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import dexterTheme from './theme/theme';
import './styles.css';

// Suppress source map warnings in development mode
if (import.meta.env.DEV && import.meta.env.VITE_SUPPRESS_SOURCEMAP_WARNINGS === 'true') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Source map error') || 
       args[0].includes('Failed to parse source map'))
    ) {
      // Skip source map errors
      return;
    }
    originalConsoleError(...args);
  };
}

// Create a QueryClient with global error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for React Query
      retry: 1, // Retry failed requests just once
      refetchOnWindowFocus: true, // Auto-refresh when tab gets focus
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache for 30 minutes
      // Global error handler
      onError: (error) => {
        console.error('React Query Error:', error);
        // Error notifications are handled at the component level
        // using the error handling utilities
      },
    },
    mutations: {
      // Global error handling for mutations
      onError: (error) => {
        console.error('Mutation Error:', error);
        // Error notifications are handled at the component level
      },
    },
  },
});

// Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider 
      theme={dexterTheme} 
      defaultColorScheme="light"
      withCssVariables={false} // Disable CSS variables to avoid the forEach error
      withNormalizeCSS // Add normalize CSS for browser consistency
    >
      <Notifications position="top-right" zIndex={1000} />
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);
