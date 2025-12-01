// tests/components/ErrorHandling/ErrorBoundary.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../../src/components/ErrorHandling/ErrorBoundary';
import { logErrorToService } from '../../../src/utils/errorTracking';
import ErrorFactory from '../../../src/utils/errorFactory';

// Mock dependencies
vi.mock('../../../src/utils/errorTracking', () => ({
  logErrorToService: vi.fn()
}));

vi.mock('../../../src/utils/errorFactory', () => ({
  default: {
    create: vi.fn((error, options) => ({
      ...error,
      ...options
    }))
  }
}));

// Component that throws an error
const BuggyComponent = ({ shouldThrow = true, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Working component</div>;
};

// Mock generateErrorId to return predictable values
const mockErrorId = 'ERR-TEST123';
vi.mock('crypto', () => ({
  randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress React's error boundary console errors for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('logs error to error tracking service', () => {
    render(
      <ErrorBoundary name="TestBoundary">
        <BuggyComponent errorMessage="Tracked error" />
      </ErrorBoundary>
    );

    expect(ErrorFactory.create).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        category: 'react_error',
        retryable: false,
        metadata: expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundaryName: 'TestBoundary'
        })
      })
    );
    
    expect(logErrorToService).toHaveBeenCalled();
  });

  it('shows error ID when enabled', () => {
    render(
      <ErrorBoundary showErrorId={true}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Reference/)).toBeInTheDocument();
  });

  it('hides error ID when disabled', () => {
    render(
      <ErrorBoundary showErrorId={false}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it('renders detailed error info when enabled', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    // Component stack should be visible
    const preElement = screen.getByText(/BuggyComponent/, { selector: 'pre' });
    expect(preElement).toBeInTheDocument();
  });

  it('calls onReset when "Try Again" button is clicked', () => {
    const handleReset = vi.fn();
    
    render(
      <ErrorBoundary onReset={handleReset}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders custom fallback when provided as a component', () => {
    const CustomFallback = () => <div>Custom error UI</div>;
    
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('renders custom fallback when provided as a function', () => {
    const customFallback = (error, errorInfo, reset, errorId) => (
      <div>
        <h2>Function Fallback</h2>
        <p>{error.message}</p>
        <button onClick={reset}>Reset</button>
        <p>ID: {errorId}</p>
      </div>
    );
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Function Fallback')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    // Test that reset function is passed correctly
    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);
    expect(screen.queryByText('Function Fallback')).not.toBeInTheDocument();
  });

  it('shows or hides reload button based on props', () => {
    render(
      <ErrorBoundary showReloadButton={false}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Reload Page')).not.toBeInTheDocument();
    
    // Re-render with the button enabled
    render(
      <ErrorBoundary showReloadButton={true}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('resets state when error is resolved', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the component and rerender
    rerender(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // After clicking "Try Again", the component should render normally
    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});
