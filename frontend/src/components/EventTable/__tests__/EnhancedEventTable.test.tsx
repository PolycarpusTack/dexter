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

// Mock the store
jest.mock('../../../store/appStore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    organizationId: 'org123',
    projectId: 'proj123',
    setSelectedIssue: jest.fn()
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