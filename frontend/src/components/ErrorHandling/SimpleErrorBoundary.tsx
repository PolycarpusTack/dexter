// File: frontend/src/components/ErrorHandling/SimpleErrorBoundary.tsx

import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface SimpleFallbackProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
}

interface SimpleErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<SimpleFallbackProps>;
  onError?: (error: Error) => void;
}

/**
 * @deprecated Use ErrorBoundary instead
 * 
 * Simple error boundary component to catch errors in child components
 * This is maintained for backward compatibility but internally uses the enhanced ErrorBoundary
 */
const SimpleErrorBoundary: React.FC<SimpleErrorBoundaryProps> = (props) => {
  // Simple fallback UI that matches the original
  const SimpleFallback: React.FC<SimpleFallbackProps> = ({ error, resetErrorBoundary }) => (
    <div style={{ 
      padding: '16px', 
      margin: '8px', 
      backgroundColor: '#ffebee', 
      border: '1px solid #f44336',
      borderRadius: '4px'
    }}>
      <h3 style={{ color: '#d32f2f', margin: '0 0 8px 0' }}>Something went wrong</h3>
      <p style={{ margin: '0 0 8px 0' }}>
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button 
        onClick={resetErrorBoundary}
        style={{
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
    </div>
  );

  // Use the props.fallback if provided, otherwise use the SimpleFallback
  const FallbackComponent = props.fallback 
    ? ({ error, resetErrorBoundary }: SimpleFallbackProps) => 
        React.createElement(props.fallback as React.ComponentType<SimpleFallbackProps>, {
          error,
          resetErrorBoundary
        })
    : SimpleFallback;

  // Use the enhanced ErrorBoundary with the appropriate fallback
  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={props.onError}
      name="SimpleErrorBoundary"
      level="component"
    >
      {props.children}
    </ErrorBoundary>
  );
};

export default SimpleErrorBoundary;
