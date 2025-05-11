import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedErrorBoundary } from '../EnhancedErrorBoundary';
import { MantineProvider } from '@mantine/core';

// Component that throws an error
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Component rendered successfully</div>;
};

describe('EnhancedErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  const renderWithMantine = (ui: React.ReactElement) => {
    return render(
      <MantineProvider>
        {ui}
      </MantineProvider>
    );
  };

  it('renders children when there is no error', () => {
    renderWithMantine(
      <EnhancedErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });

  it('catches errors and displays fallback UI', () => {
    renderWithMantine(
      <EnhancedErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows retry button and handles retry', () => {
    renderWithMantine(
      <EnhancedErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    // Click retry button
    fireEvent.click(retryButton);
    
    // Check if retry count updates
    expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
  });

  it('calls onError callback when provided', () => {
    const onError = jest.fn();
    
    renderWithMantine(
      <EnhancedErrorBoundary onError={onError}>
        <ErrorThrowingComponent shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = <div>Custom error UI</div>;
    
    renderWithMantine(
      <EnhancedErrorBoundary fallback={CustomFallback}>
        <ErrorThrowingComponent shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets error when resetKeys change', () => {
    const { rerender } = renderWithMantine(
      <EnhancedErrorBoundary resetOnPropsChange resetKeys={['key']}>
        <ErrorThrowingComponent shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render with different key to trigger reset
    rerender(
      <MantineProvider>
        <EnhancedErrorBoundary resetOnPropsChange resetKeys={['key']} key="new">
          <ErrorThrowingComponent shouldThrow={false} />
        </EnhancedErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });
});
