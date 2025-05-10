// File: src/components/ErrorHandling/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState } from '../../types/errorHandling';
import ErrorFallback from './ErrorFallback';

/**
 * Error Boundary component to catch and handle React errors
 * 
 * Wraps child components and displays a fallback UI when errors occur
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console (we could also log to an error tracking service)
    console.error(`Error caught by ${this.props.name || 'ErrorBoundary'}:`, error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showDetails = true } = this.props;
    
    // If no error, render children normally
    if (!hasError || !error) {
      return children;
    }
    
    // If a custom fallback was provided and is a function, call it
    if (typeof fallback === 'function') {
      return fallback(error, this.resetError);
    }
    
    // If a custom fallback was provided as a component, render it
    if (fallback) {
      return fallback;
    }
    
    // Use default error fallback
    return (
      <ErrorFallback 
        error={error} 
        resetError={this.resetError} 
        showDetails={showDetails}
      />
    );
  }
}

export default ErrorBoundary;
