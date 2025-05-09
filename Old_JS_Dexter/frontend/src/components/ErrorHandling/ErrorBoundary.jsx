// File: frontend/src/components/ErrorHandling/ErrorBoundary.jsx

import React from 'react';
import ErrorFallback from './ErrorFallback';
import { logErrorToService } from '../../utils/errorTracking';
import { RecoveryService } from '../../utils/errorRecovery';

/**
 * Enhanced error boundary component with improved recovery strategies and error context
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    // Sanitize errors in production
    const sanitizedError = process.env.NODE_ENV === 'production'
      ? { name: error.name, message: error.message }
      : error;
    
    // Update errorInfo state
    this.setState({ errorInfo });
    
    // Log detailed error information
    console.error(
      `Error caught by ${this.props.name || 'ErrorBoundary'}:`, 
      sanitizedError, 
      errorInfo
    );
    
    // Log to error tracking service with context
    logErrorToService(error, {
      source: this.props.name || 'ErrorBoundary',
      componentStack: errorInfo?.componentStack,
      level: this.props.level || 'component',
      route: window.location.pathname,
      boundary: this.props.name,
      errorId: this.state.errorId,
    });
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  /**
   * Execute a recovery strategy based on the error type
   */
  executeRecovery = (strategyName, ...args) => {
    // Determine strategy if not provided
    const strategy = strategyName || 
      (this.props.recoveryStrategy || 
        RecoveryService.determineStrategy(this.state.error));
    
    // Execute the selected recovery strategy
    RecoveryService.execute(strategy, this.reset, ...args);
  };

  render() {
    if (this.state.hasError) {
      // Props for fallback component
      const fallbackProps = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        resetErrorBoundary: this.reset,
        executeRecovery: this.executeRecovery,
        errorId: this.state.errorId,
        boundary: this.props.name || 'ErrorBoundary',
        level: this.props.level || 'component',
        showDetails: this.props.showDetails ?? process.env.NODE_ENV !== 'production',
      };
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(
            this.state.error, 
            this.state.errorInfo, 
            this.reset, 
            this.state.errorId
          );
        }
        return this.props.fallback;
      }
      
      // Use custom FallbackComponent if provided, otherwise use default
      const FallbackComponent = this.props.FallbackComponent || ErrorFallback;
      
      return <FallbackComponent {...fallbackProps} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
