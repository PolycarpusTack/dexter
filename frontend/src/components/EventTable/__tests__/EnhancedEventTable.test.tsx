import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EnhancedEventTable from '../EnhancedEventTable';

// Mock the unified API modules
jest.mock('../../../api/unified', () => ({
  api: {
    events: {
      getIssues: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'issue123',
            title: 'Test Issue',
            level: 'error',
            count: 5,
            lastSeen: new Date().toISOString(),
            tags: [{ key: 'browser', value: 'chrome' }]
          }
        ],
        count: 1,
        hasMore: false
      })
    }
  }
}));

// Mock the stores
jest.mock('../../../store', () => ({
  useAuthStore: jest.fn(() => ({
    organizationSlug: 'org123',
    projectSlug: 'proj123'
  })),
  useSelectionStore: jest.fn(() => ({
    setSelectedIssue: jest.fn()
  })),
  useFilterStore: jest.fn(() => ({
    statusFilter: 'all',
    searchQuery: ''
  }))
}));

// Mock the useAuditLog hook
jest.mock('../../../hooks/useAuditLog', () => ({
  useAuditLog: jest.fn(() => jest.fn())
}));

describe('EnhancedEventTable', () => {
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
        <EnhancedEventTable />
      </QueryClientProvider>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});