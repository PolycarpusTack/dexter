// File: frontend/src/components/ErrorHandling/__tests__/ErrorBoundary.test.jsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../index';

// Mock console.error to avoid test noise
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// Mock error tracking to avoid actual API calls
jest.mock('../../../utils/errorTracking', () => ({
  logErrorToService: jest.fn(),
}));

// Mock recovery service
jest.mock('../../../utils/errorRecovery', () => ({
  RecoveryService: {
    determineStrategy: jest.fn().mockReturnValue('default'),
    execute: jest.fn((strategy, reset) => reset()),
  },
}));

// Component that throws an error for testing
const BuggyComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working Component</div>;
};

describe('ErrorBoundary', () => {
  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">No error</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('renders fallback when error occurs', () => {
    // Suppress error boundary console.error for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    
    spy.mockRestore();
  });

  test('resets state on retry button click', () => {
    // Suppress error boundary console.error for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    // Error boundary should show fallback
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    
    // Click retry button
    fireEvent.click(screen.getByText(/try again/i));
    
    // Update component to not throw
    rerender(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    // Should show the child component now
    expect(screen.getByText(/working component/i)).toBeInTheDocument();
    
    spy.mockRestore();
  });

  test('calls onError prop when error occurs', () => {
    // Suppress error boundary console.error for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    // onError should have been called
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.anything(),
      expect.any(String)
    );
    
    spy.mockRestore();
  });

  test('uses custom fallback component when provided', () => {
    // Suppress error boundary console.error for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    const CustomFallback = ({ error, resetErrorBoundary }) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>{error.message}</p>
        <button onClick={resetErrorBoundary}>Custom Reset</button>
      </div>
    );
    
    render(
      <ErrorBoundary FallbackComponent={CustomFallback}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/custom error ui/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
    expect(screen.getByText(/custom reset/i)).toBeInTheDocument();
    
    spy.mockRestore();
  });

  test('sanitizes error details in production', () => {
    // Suppress error boundary console.error for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(
      <ErrorBoundary showDetails={false}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    // Error message should not be displayed
    expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
    
    // Reset env
    process.env.NODE_ENV = originalEnv;
    spy.mockRestore();
  });
});
