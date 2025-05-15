/**
 * Integration tests for EnhancedEventTable with the unified API
 */

import { vi, describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import EnhancedEventTable from '../EnhancedEventTable';
import { api } from '../../../api/unified';
import { resolveApiPath } from '../../../api/unified/pathResolver';

// Mock API data
const mockEvents = {
  items: [
    {
      id: 'event1',
      title: 'ReferenceError: x is not defined',
      level: 'error',
      count: 5,
      timestamp: '2023-05-15T10:20:30Z',
      users_affected: 3,
      culprit: 'main.js',
      project: 'test-project',
      status: 'unresolved'
    },
    {
      id: 'event2',
      title: 'TypeError: Cannot read property',
      level: 'warning',
      count: 2,
      timestamp: '2023-05-15T09:15:20Z',
      users_affected: 1,
      culprit: 'utils.js',
      project: 'test-project',
      status: 'resolved'
    }
  ],
  meta: {
    total: 2,
    page: 1,
    perPage: 50
  }
};

// Mock the app store
vi.mock('../../../store/appStore', () => ({
  default: vi.fn(() => ({
    organizationId: 'test-org',
    projectId: 'test-project',
    setSelectedIssue: vi.fn()
  })),
  getState: () => ({
    setSelectedIssue: vi.fn()
  })
}));

// Mock the audit log hook
vi.mock('../../../hooks/useAuditLog', () => ({
  useAuditLog: () => vi.fn()
}));

// Mock the keyboard navigation hooks
vi.mock('../../../hooks/useTableKeyboardNavigation', () => ({
  default: () => ({
    focusedIndex: 0,
    setFocusedIndex: vi.fn(),
    handleKeyDown: vi.fn()
  })
}));

vi.mock('../../../hooks/useGlobalShortcuts', () => ({
  useGlobalShortcuts: vi.fn()
}));

// Get API path from configuration
const eventsPath = resolveApiPath('events', 'getIssues');

// Set up MSW server
const server = setupServer(
  rest.get(eventsPath, (req, res, ctx) => {
    const searchQuery = req.url.searchParams.get('query') || '';
    const level = req.url.searchParams.get('level') || '';
    
    // Filter the mock data based on search query and level
    let filteredItems = [...mockEvents.items];
    
    if (searchQuery) {
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.culprit.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (level) {
      filteredItems = filteredItems.filter(item => item.level === level);
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        ...mockEvents,
        items: filteredItems,
        meta: {
          ...mockEvents.meta,
          total: filteredItems.length
        }
      })
    );
  })
);

// Set up the QueryClient for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0
    }
  }
});

// Wrapper component with QueryClientProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Set up and tear down MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EnhancedEventTable Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display events using the unified API', async () => {
    // Spy on the API call
    const apiSpy = vi.spyOn(api.events, 'getIssues');
    
    render(<EnhancedEventTable />, { wrapper });
    
    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    });
    
    // Verify API was called with correct parameters
    expect(apiSpy).toHaveBeenCalledWith(expect.objectContaining({
      organization: 'test-org',
      projectId: 'test-project',
      page: 1
    }));
    
    // Check that both events are displayed
    expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    expect(screen.getByText('TypeError: Cannot read property')).toBeInTheDocument();
  });

  it('should filter events by search query', async () => {
    render(<EnhancedEventTable />, { wrapper });
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    });
    
    // Find the search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    
    // Type in the search box
    fireEvent.change(searchInput, { target: { value: 'TypeError' } });
    
    // Should re-fetch with the search query
    await waitFor(() => {
      expect(screen.queryByText('ReferenceError: x is not defined')).not.toBeInTheDocument();
      expect(screen.getByText('TypeError: Cannot read property')).toBeInTheDocument();
    });
  });

  it('should filter events by level', async () => {
    render(<EnhancedEventTable />, { wrapper });
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    });
    
    // Find the level filter dropdown
    const levelFilter = screen.getByRole('combobox');
    
    // Open the dropdown
    fireEvent.click(levelFilter);
    
    // Wait for dropdown options to appear
    await waitFor(() => {
      const errorOption = screen.getByText('error');
      // Select the 'error' option
      fireEvent.click(errorOption);
    });
    
    // Should re-fetch with the level filter
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
      expect(screen.queryByText('TypeError: Cannot read property')).not.toBeInTheDocument();
    });
  });

  it('should select an event when clicked', async () => {
    // Mock the onEventSelect callback
    const onEventSelect = vi.fn();
    
    render(<EnhancedEventTable onEventSelect={onEventSelect} />, { wrapper });
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    });
    
    // Find the first event row and click it
    const firstEventRow = screen.getByText('ReferenceError: x is not defined').closest('tr');
    if (!firstEventRow) throw new Error('Event row not found');
    
    fireEvent.click(firstEventRow);
    
    // Verify onEventSelect was called with the correct event
    expect(onEventSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'event1',
      title: 'ReferenceError: x is not defined'
    }));
  });

  it('should handle error states gracefully', async () => {
    // Override the server handler to return an error
    server.use(
      rest.get(eventsPath, (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Server error' })
        );
      })
    );
    
    render(<EnhancedEventTable />, { wrapper });
    
    // Wait for the error state
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
    
    // Should display an error message
    expect(screen.getByText(/something went wrong/i, { exact: false })).toBeInTheDocument();
  });

  it('should refresh data when the refresh button is clicked', async () => {
    // Spy on the API call
    const apiSpy = vi.spyOn(api.events, 'getIssues');
    
    render(<EnhancedEventTable />, { wrapper });
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeInTheDocument();
    });
    
    // Clear the spy to start fresh
    apiSpy.mockClear();
    
    // Find and click the refresh button
    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);
    
    // Verify the API was called again
    expect(apiSpy).toHaveBeenCalled();
  });
});