/**
 * Integration tests for ExplainError with the unified API
 */

import { vi, describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import ExplainError from '../ExplainError';
import { api } from '../../../api/unified';
import { resolveApiPath } from '../../../api/unified/pathResolver';
import { EventDetails } from '../../../types/errorHandling';

// Mock event details
const mockEventDetails: EventDetails = {
  id: 'event123',
  title: 'ReferenceError: x is not defined',
  type: 'error',
  value: 'x is not defined',
  timestamp: '2023-05-15T10:20:30Z',
  platform: 'javascript',
  environment: 'production',
  project: 'test-project',
  tags: { 
    browser: 'Chrome', 
    os: 'Windows',
    version: '1.2.3' 
  },
  context: {
    url: 'https://example.com/page',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  stacktrace: [
    {
      filename: 'main.js',
      function: 'processData',
      lineno: 42,
      colno: 15
    },
    {
      filename: 'utils.js',
      function: 'parseInput',
      lineno: 21,
      colno: 8
    }
  ]
};

// Mock AI explanation response
const mockExplanationResponse = {
  explanation: 'This is a ReferenceError which occurs when you try to access a variable that hasn\'t been defined. In this case, the code is trying to use a variable named "x" before it has been declared or initialized.',
  recommendations: [
    'Make sure to declare the variable before using it: `let x = 0;`',
    'Check for typos in variable names',
    'Verify the variable is in scope where it\'s being used'
  ],
  confidence: 0.95
};

// Mock the app store
vi.mock('../../../store/appStore', () => ({
  default: vi.fn(() => ({
    activeAIModel: 'llama3'
  }))
}));

// Mock utility functions
vi.mock('../../../utils/errorAnalytics', () => ({
  analyzeError: vi.fn(() => ({
    category: 'REFERENCE_ERROR',
    subtype: 'UNDEFINED_VARIABLE',
    severity: 'high'
  })),
  ErrorCategory: {
    REFERENCE_ERROR: 'REFERENCE_ERROR',
    TYPE_ERROR: 'TYPE_ERROR',
    SYNTAX_ERROR: 'SYNTAX_ERROR',
    RANGE_ERROR: 'RANGE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN: 'UNKNOWN'
  }
}));

vi.mock('../../../utils/promptEngineering', () => ({
  createPromptBundle: vi.fn(() => ({
    systemPrompt: 'You are a helpful AI assistant for debugging JavaScript errors.',
    userPrompt: 'Please explain this ReferenceError in simple terms.'
  }))
}));

// Mock components
vi.mock('../ModelSelector/ModelSelector', () => ({
  default: () => <div data-testid="model-selector">Model Selector</div>
}));

// Get API path from configuration
const explainErrorPath = resolveApiPath('ai', 'explainError');

// Set up MSW server
const server = setupServer(
  rest.post(explainErrorPath, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockExplanationResponse)
    );
  })
);

// Set up the QueryClient for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0
    },
    mutations: {
      retry: false
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

// Helper functions that would be in the actual component
function extractErrorType(details: EventDetails): string {
  return details?.type || 'Unknown Error';
}

function extractErrorMessage(details: EventDetails): string {
  return details?.value || details?.title || 'Unknown Error';
}

function getStackTraceFromEvent(details: EventDetails): string | undefined {
  if (!details?.stacktrace) return undefined;
  
  return details.stacktrace
    .map(frame => {
      return `at ${frame.function} (${frame.filename}:${frame.lineno}:${frame.colno})`;
    })
    .join('\n');
}

// Add these to the global scope to match the component
global.extractErrorType = extractErrorType;
global.extractErrorMessage = extractErrorMessage;
global.getStackTraceFromEvent = getStackTraceFromEvent;

describe('ExplainError Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render in collapsed state initially', () => {
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Should show basic info in collapsed state
    expect(screen.getByText(/AI Explanation/i)).toBeInTheDocument();
    expect(screen.getByText(/Explain this error/i)).toBeInTheDocument();
    
    // Should not show expanded content
    expect(screen.queryByText(/This is a ReferenceError/i)).not.toBeInTheDocument();
  });

  it('should call the unified API when expanded', async () => {
    // Spy on the API
    const aiApiSpy = vi.spyOn(api.ai, 'explainError');
    
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /explain this error/i });
    fireEvent.click(expandButton);
    
    // Should show loading state
    expect(screen.getByText(/Generating AI explanation/i)).toBeInTheDocument();
    
    // Wait for the explanation to load
    await waitFor(() => {
      expect(screen.getByText(/This is a ReferenceError/i)).toBeInTheDocument();
    });
    
    // Verify the API was called with the right parameters
    expect(aiApiSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        errorText: 'x is not defined',
        context: expect.objectContaining({
          eventData: mockEventDetails,
          errorType: 'error',
          category: 'REFERENCE_ERROR'
        }),
        model: 'llama3',
        options: expect.objectContaining({
          includeRecommendations: true
        })
      }),
      expect.anything()
    );
    
    // Check that recommendations are displayed
    expect(screen.getByText(/Make sure to declare the variable/i)).toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    // Override the server handler to return an error
    server.use(
      rest.post(explainErrorPath, (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Server error' })
        );
      })
    );
    
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /explain this error/i });
    fireEvent.click(expandButton);
    
    // Wait for the error state
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
    
    // Should display retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should retry when retry button is clicked', async () => {
    // Reset the server to normal behavior
    server.resetHandlers();
    
    // Spy on the API
    const aiApiSpy = vi.spyOn(api.ai, 'explainError');
    
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /explain this error/i });
    fireEvent.click(expandButton);
    
    // Wait for the explanation to load
    await waitFor(() => {
      expect(screen.getByText(/This is a ReferenceError/i)).toBeInTheDocument();
    });
    
    // Find and click the retry button
    const retryButton = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(retryButton);
    
    // Should call the API again
    await waitFor(() => {
      expect(aiApiSpy).toHaveBeenCalledTimes(2);
    });
    
    // Second call should include incremented retry count
    expect(aiApiSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          retryCount: 1
        })
      }),
      expect.anything()
    );
  });

  it('should display recommendations correctly', async () => {
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /explain this error/i });
    fireEvent.click(expandButton);
    
    // Wait for the explanation to load
    await waitFor(() => {
      expect(screen.getByText(/This is a ReferenceError/i)).toBeInTheDocument();
    });
    
    // Check that all recommendations are displayed
    expect(screen.getByText(/Make sure to declare the variable/i)).toBeInTheDocument();
    expect(screen.getByText(/Check for typos in variable names/i)).toBeInTheDocument();
    expect(screen.getByText(/Verify the variable is in scope/i)).toBeInTheDocument();
  });

  it('should toggle advanced settings', async () => {
    render(<ExplainError eventDetails={mockEventDetails} />, { wrapper });
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /explain this error/i });
    fireEvent.click(expandButton);
    
    // Wait for the explanation to load
    await waitFor(() => {
      expect(screen.getByText(/This is a ReferenceError/i)).toBeInTheDocument();
    });
    
    // Find and click the settings button
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    // Check that advanced settings are displayed
    expect(screen.getByText(/Context-aware prompting/i)).toBeInTheDocument();
  });
});