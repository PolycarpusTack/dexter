// File: frontend/src/components/ErrorHandling/ErrorBoundary.jsx

import React from 'react';
import { Alert, Button, Stack, Text, Title, Paper } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

/**
 * Error Boundary component to catch JS errors in child components
 * and display a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Render custom fallback UI if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, this.handleReset)
          : fallback;
      }

      // Default fallback UI
      return (
        <Paper p="xl" withBorder shadow="md" radius="md" mt="md" mb="md">
          <Stack align="center" spacing="md">
            <IconAlertTriangle size={48} color="var(--mantine-color-red-6)" />
            <Title order={3}>Something went wrong</Title>
            
            <Alert color="red" w="100%">
              <Text size="sm">
                {error?.message || 'An unexpected error occurred'}
              </Text>
            </Alert>
            
            {showDetails && errorInfo && (
              <Paper withBorder p="xs" style={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
                <Text size="xs" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                  {errorInfo.componentStack}
                </Text>
              </Paper>
            )}
            
            <Button 
              leftSection={<IconRefresh size={16} />} 
              onClick={this.handleReset}
              color="blue"
            >
              Try Again
            </Button>
          </Stack>
        </Paper>
      );
    }

    // If no error, render children normally
    return children;
  }
}

export default ErrorBoundary;
