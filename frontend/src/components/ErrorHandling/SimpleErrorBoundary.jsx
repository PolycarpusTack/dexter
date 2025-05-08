// File: frontend/src/components/ErrorHandling/SimpleErrorBoundary.jsx

import React from 'react';

/**
 * Simple error boundary component to catch errors in child components
 * This is a temporary solution until react-error-boundary is properly installed
 */
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        // If a fallback component is provided, use it
        return React.createElement(this.props.fallback, {
          error: this.state.error,
          resetErrorBoundary: () => this.setState({ hasError: false, error: null })
        });
      }
      
      // Default fallback UI
      return (
        <div style={{ 
          padding: '16px', 
          margin: '8px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px'
        }}>
          <h3 style={{ color: '#d32f2f', margin: '0 0 8px 0' }}>Something went wrong</h3>
          <p style={{ margin: '0 0 8px 0' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
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
    }

    return this.props.children;
  }
}

export default SimpleErrorBoundary;
