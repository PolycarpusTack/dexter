// File: src/components/ErrorHandling/withErrorBoundary.tsx

import React, { ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { WithErrorBoundaryOptions } from '../../types/errorHandling';

/**
 * Higher-order component that wraps a component with an error boundary
 * 
 * @param Component - Component to wrap
 * @param options - Error boundary options
 * @returns Component wrapped with error boundary
 */
export function withErrorBoundary<P extends JSX.IntrinsicAttributes>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const { name = Component.displayName || Component.name, showDetails = true } = options;
  
  // Define the wrapper component
  const WithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary name={name} showDetails={showDetails}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  // Set display name for debugging
  WithErrorBoundary.displayName = `WithErrorBoundary(${name})`;
  
  return WithErrorBoundary;
}

export default withErrorBoundary;
