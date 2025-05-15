import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventTable } from '../EventTable';

// Mock the unified API modules
jest.mock('../../../api/unified', () => ({
  api: {
    events: {
      getEvents: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'event123',
            title: 'Test Error',
            level: 'error',
            platform: 'javascript',
            count: 5,
            lastSeen: new Date().toISOString(),
          }
        ]
      })
    }
  }
}));

// Mock the store
jest.mock('../../../store/appStore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    organizationId: 'org123',
    projectId: 'proj123'
  }))
}));

describe('EventTable', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  test('renders loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EventTable />
      </QueryClientProvider>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});