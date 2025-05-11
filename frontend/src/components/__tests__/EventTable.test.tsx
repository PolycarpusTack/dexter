// File: frontend/src/components/__tests__/EventTable.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';

import EventTable from '../EventTable';
import { apiClient } from '../../api/apiClient';
import { useOptimizedApi } from '../../api/optimizedApiExample';

// Mock the API client
vi.mock('../../api/apiClient');
vi.mock('../../api/optimizedApiExample');

// Mock data
const mockEvents = [
  {
    id: 'event-1',
    title: 'Error in production',
    message: 'TypeError: Cannot read property of undefined',
    timestamp: '2024-01-01T12:00:00Z',
    platform: 'javascript',
    level: 'error',
    user: { id: 'user-1', email: 'test@example.comtest@example.com' },
    tags: { environment: 'production', release: '1.0.0' }
  },
  {
    id: 'event-2',
    title: 'Database connection failed',
    message: 'Connection timeout',
    timestamp: '2024-01-01T12:05:00Z',
    platform: 'python',
    level: 'warning',
    tags: { environment: 'staging' }
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
};

describe('EventTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses
    (apiClient.get as any).mockResolvedValue(mockEvents);
    (apiClient.batchGet as any).mockResolvedValue(mockEvents);
  });

  it('renders event table with data', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading events/i)).toBeInTheDocument();
    });
  });

  it('supports filtering by search query', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search events/i);
    await userEvent.type(searchInput, 'TypeError');

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          query: 'TypeError'
        })
      })
    );
  });

  it('supports filtering by environment', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const envSelect = screen.getByLabelText(/environment/i);
    
    // Change selection
    fireEvent.change(envSelect, { target: { value: 'production' } });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          environment: 'production'
        })
      })
    );
  });

  it('supports pagination', async () => {
    const paginatedResponse = {
      results: mockEvents,
      next: 'cursor-123',
      previous: null
    };
    
    (apiClient.get as any).mockResolvedValue(paginatedResponse);

    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText(/next page/i);
    expect(nextButton).toBeEnabled();

    await userEvent.click(nextButton);

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          cursor: 'cursor-123'
        })
      })
    );
  });

  it('supports bulk selection and actions', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    // Select all checkbox
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await userEvent.click(selectAllCheckbox);

    // Bulk action menu should appear
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    
    const bulkActionButton = screen.getByText(/bulk actions/i);
    await userEvent.click(bulkActionButton);

    const resolveOption = screen.getByText(/mark as resolved/i);
    await userEvent.click(resolveOption);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/issues/bulk',
      expect.objectContaining({
        updates: expect.arrayContaining([
          expect.objectContaining({ status: 'resolved' })
        ])
      })
    );
  });

  it('displays event details on row click', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const eventRow = screen.getByText('Error in production').closest('tr');
    await userEvent.click(eventRow!);

    // Should display event details modal/drawer
    await waitFor(() => {
      expect(screen.getByText(/event details/i)).toBeInTheDocument();
      expect(screen.getByText('TypeError: Cannot read property of undefined')).toBeInTheDocument();
    });
  });
  
  it('handles keyboard navigation through events', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    // Select the first row
    const eventRow = screen.getByText('Error in production').closest('tr');
    fireEvent.click(eventRow!);
    
    // Navigate to next row using keyboard
    fireEvent.keyDown(eventRow!, { key: 'ArrowDown', code: 'ArrowDown' });
    
    // Check if the second row got focus
    await waitFor(() => {
      const secondRow = screen.getByText('Database connection failed').closest('tr');
      expect(secondRow).toHaveFocus();
    });
    
    // Press Enter to view details
    const secondRow = screen.getByText('Database connection failed').closest('tr');
    fireEvent.keyDown(secondRow!, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/event details/i)).toBeInTheDocument();
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });
  });

  it('refreshes data on interval', async () => {
    vi.useFakeTimers();

    render(
      <TestWrapper>
        <EventTable refreshInterval={5000} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Advance time
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('supports column sorting', async () => {
    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const timestampHeader = screen.getByText(/timestamp/i);
    await userEvent.click(timestampHeader);

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          sort: '-timestamp'
        })
      })
    );
  });

  it('displays proper error states for network failures', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('Network Error'));

    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByText(/retry/i);
    await userEvent.click(retryButton);

    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('uses optimized batch loading for visible rows', async () => {
    const optimizedService = {
      getMultipleIssues: vi.fn().mockResolvedValue(mockEvents),
      prefetchIssues: vi.fn(),
    };
    
    (useOptimizedApi as any).mockReturnValue({ service: optimizedService });

    render(
      <TestWrapper>
        <EventTable optimized={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(optimizedService.getMultipleIssues).toHaveBeenCalled();
    });
  });

  it('handles real-time updates via WebSocket', async () => {
    const onEventUpdate = vi.fn();
    
    render(
      <TestWrapper>
        <EventTable onEventUpdate={onEventUpdate} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    // Simulate WebSocket update
    const updatedEvent = { ...mockEvents[0], title: 'Updated Error' };
    onEventUpdate(updatedEvent);

    await waitFor(() => {
      expect(screen.getByText('Updated Error')).toBeInTheDocument();
    });
  });

  it('exports data in different formats', async () => {
    const exportFn = vi.fn();
    
    render(
      <TestWrapper>
        <EventTable onExport={exportFn} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error in production')).toBeInTheDocument();
    });

    const exportButton = screen.getByLabelText(/export/i);
    await userEvent.click(exportButton);

    const csvOption = screen.getByText(/export as csv/i);
    await userEvent.click(csvOption);

    expect(exportFn).toHaveBeenCalledWith(mockEvents, 'csv');
  });
});

describe('EventTable Performance', () => {
  it('renders large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...mockEvents[0],
      id: `event-${i}`,
      title: `Event ${i}`
    }));

    (apiClient.get as any).mockResolvedValue(largeDataset);

    const startTime = performance.now();

    render(
      <TestWrapper>
        <EventTable virtualized={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Event 0')).toBeInTheDocument();
    });

    const renderTime = performance.now() - startTime;
    
    // Should render within reasonable time
    expect(renderTime).toBeLessThan(1000);

    // Should only render visible rows
    const renderedRows = screen.getAllByRole('row');
    expect(renderedRows.length).toBeLessThan(100); // Virtualized
  });

  it('debounces search input to prevent excessive API calls', async () => {
    vi.useFakeTimers();

    render(
      <TestWrapper>
        <EventTable />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search events/i);
    
    // Type quickly
    await userEvent.type(searchInput, 'test');
    
    // API shouldn't be called immediately
    expect(apiClient.get).toHaveBeenCalledTimes(1); // Initial load only

    // Advance timers
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2); // One debounced call
    });

    vi.useRealTimers();
  });
});
