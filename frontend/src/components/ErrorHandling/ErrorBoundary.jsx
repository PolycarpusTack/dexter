// File: frontend/src/components/ErrorHandling/ErrorBoundary.jsx

import React from 'react';
import ErrorFallback from './ErrorFallback';

/**
 * Error boundary component to catch errors in its child components
 * This is a simplified implementation that doesn't require external packages
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      const FallbackComponent = this.props.FallbackComponent || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
