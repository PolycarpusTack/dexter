import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';

// Create a custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  route?: string;
}

function customRender(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Notifications />
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  }

  // Set the initial route
  window.history.pushState({}, 'Test page', route);

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Helper to wait for async operations
export async function waitForLoadingToFinish() {
  // Proper imports for testing-library
  const { waitFor } = await import('@testing-library/react');
  
  // Use the screen from testing-library
  const screen = await import('@testing-library/react').then(mod => mod.screen);
  const loadingElements = await screen.findAllByText(/loading/i);
  
  await waitFor(() => {
    loadingElements.forEach((element: HTMLElement) => {
      expect(element).not.toBeInTheDocument();
    });
  });
}

// Helper to mock API responses
export function mockApiResponse(endpoint: string, response: any, status = 200) {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: status < 300,
        status,
        json: async () => response,
      });
    }
    return Promise.reject(new Error('Not found'));
  });
}

// Helper to get by text with partial match
export function getByTextContent(text: string) {
  // Import screen from testing-library
  const { screen } = require('@testing-library/react');
  
  return screen.getByText((content: string, element: Element | null) => {
    const hasText = (element: Element | null): boolean => element?.textContent === text;
    const elementHasText = hasText(element);
    const childrenDontHaveText = element?.children 
      ? Array.from(element.children).every((child: Element) => !hasText(child))
      : true;
    return elementHasText && childrenDontHaveText;
  });
}

// Helper for testing navigation
export function expectNavigation(pathname: string) {
  expect(window.location.pathname).toBe(pathname);
}
