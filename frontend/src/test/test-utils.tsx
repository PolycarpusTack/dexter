// File: frontend/src/test/test-utils.tsx

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';

// Mock store for testing
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      // Add your reducers here
      app: (state = initialState) => state,
    },
    preloadedState: initialState,
  });
};

interface AllProvidersProps {
  children: React.ReactNode;
  initialState?: any;
  queryClientConfig?: any;
}

export const AllProviders: React.FC<AllProvidersProps> = ({ 
  children, 
  initialState = {},
  queryClientConfig = {}
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        ...queryClientConfig.queries
      },
      mutations: {
        retry: false,
        ...queryClientConfig.mutations
      }
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    }
  });

  const store = createMockStore(initialState);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </MantineProvider>
      </QueryClientProvider>
    </Provider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialState?: any;
    queryClientConfig?: any;
  }
) => {
  const { initialState, queryClientConfig, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialState={initialState} queryClientConfig={queryClientConfig}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utility functions for testing
export const waitForLoadingToFinish = () =>
  waitFor(() => {
    const loadingElements = screen.queryAllByText(/loading/i);
    expect(loadingElements).toHaveLength(0);
  });

export const createMockResponse = (data: any, options = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  ...options
});

export const createMockError = (message = 'Error', status = 500) => ({
  response: {
    data: { detail: message },
    status,
    statusText: status === 404 ? 'Not Found' : 'Internal Server Error',
  },
  message,
  isAxiosError: true
});

// Mock IntersectionObserver for virtualized components
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn().mockReturnValue(null),
    unobserve: vi.fn().mockReturnValue(null),
    disconnect: vi.fn().mockReturnValue(null)
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn().mockReturnValue(null),
    unobserve: vi.fn().mockReturnValue(null),
    disconnect: vi.fn().mockReturnValue(null)
  });
  window.ResizeObserver = mockResizeObserver;
};

// Performance testing utilities
export const measureRenderTime = async (component: React.ReactElement) => {
  const startTime = performance.now();
  const { unmount } = render(component);
  await waitForLoadingToFinish();
  const endTime = performance.now();
  unmount();
  return endTime - startTime;
};

export const simulateSlowNetwork = () => {
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return originalFetch(...args);
  };
  return () => {
    global.fetch = originalFetch;
  };
};

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  const axe = await import('axe-core');
  const results = await axe.run(container);
  return results.violations;
};
