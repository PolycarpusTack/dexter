// File: src/components/ErrorHandling/withErrorBoundary.tsx

import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Interface for withErrorBoundary options
 */
export interface WithErrorBoundaryOptions {
  /** Optional name for the error boundary */
  name?: string;
  /** Whether to show error details */
  showDetails?: boolean;
  /** Whether to show reload button */
  showReloadButton?: boolean;
  /** Whether to show home button */
  showHomeButton?: boolean;
  /** Whether to show error ID */
  showErrorId?: boolean;
  /** Custom fallback component or function */
  fallback?: React.ReactNode | ((error: Error, errorInfo: React.ErrorInfo, reset: () => void, errorId: string) => React.ReactNode);
  /** Function to call when resetting the error boundary */
  onReset?: () => void;
}

/**
 * Higher-Order Component that wraps a component with an ErrorBoundary
 * 
 * @param Component - The component to wrap
 * @param options - Configuration options for the ErrorBoundary
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P>(
  Component: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  // Get the display name of the wrapped component for easier debugging
  const componentName = Component.displayName || Component.name || 'Component';
  
  // Create a wrapper component that includes the error boundary
  const WrappedComponent: React.FC<P> = (props) => {
    // Merge options with defaults
    const {
      name = `${componentName}ErrorBoundary`,
      showDetails = false,
      showReloadButton = true,
      showHomeButton = true,
      showErrorId = true,
      fallback,
      onReset
    } = options;
    
    return (
      <ErrorBoundary 
        name={name}
        showDetails={showDetails}
        showReloadButton={showReloadButton}
        showHomeButton={showHomeButton}
        showErrorId={showErrorId}
        fallback={fallback}
        onReset={onReset}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  // Set display name for easier debugging
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;
  
  return WrappedComponent;
}

export default withErrorBoundary;
