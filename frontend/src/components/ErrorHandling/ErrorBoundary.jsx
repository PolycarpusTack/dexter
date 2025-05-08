// File: frontend/src/components/ErrorHandling/ErrorBoundary.jsx

import React from 'react';
import { Alert, Button, Stack, Text, Title, Paper, Group, Divider, CopyButton, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconCopy, IconExternalLink, IconHome } from '@tabler/icons-react';
import { logErrorToService } from '../../utils/errorTracking';
import ErrorFactory from '../../utils/errorFactory';

/**
 * Generate a unique error ID for reference
 */
function generateErrorId() {
  return `ERR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

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
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorId: generateErrorId()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Log to error tracking service
    const enhancedError = ErrorFactory.create(error, {
      category: 'react_error',
      retryable: false,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        errorBoundaryName: this.props.name || 'unnamed'
      }
    });
    
    logErrorToService(enhancedError, {
      source: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundaryName: this.props.name || 'unnamed'
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call onReset callback if provided
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  }
  
  handleReload = () => {
    window.location.reload();
  }
  
  handleNavigateHome = () => {
    window.location.href = '/';
  }

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { 
      children, 
      fallback, 
      showDetails = false,
      showReloadButton = true,
      showHomeButton = true,
      showErrorId = true,
      maxDetailsHeight = 200
    } = this.props;

    if (hasError) {
      // Render custom fallback UI if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, errorInfo, this.handleReset, errorId)
          : fallback;
      }

      // Default fallback UI
      return (
        <Paper p="xl" withBorder shadow="md" radius="md" mt="md" mb="md">
          <Stack align="center" spacing="md">
            <IconAlertTriangle size={48} color="var(--mantine-color-red-6)" />
            <Title order={3}>Something went wrong</Title>
            
            {showErrorId && errorId && (
              <Group>
                <Text size="sm" c="dimmed">Reference: {errorId}</Text>
                <CopyButton value={errorId} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copied" : "Copy ID"} withArrow position="top">
                      <Button 
                        variant="subtle" 
                        size="xs" 
                        onClick={copy}
                        leftSection={<IconCopy size={12} />}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            )}
            
            <Alert color="red" w="100%">
              <Text size="sm">
                {error?.message || 'An unexpected error occurred'}
              </Text>
            </Alert>
            
            {showDetails && errorInfo && (
              <Paper withBorder p="xs" style={{ maxHeight: `${maxDetailsHeight}px`, overflow: 'auto', width: '100%' }}>
                <Text size="xs" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                  {errorInfo.componentStack}
                </Text>
              </Paper>
            )}
            
            <Divider w="100%" />
            
            <Group>
              <Button 
                leftSection={<IconRefresh size={16} />} 
                onClick={this.handleReset}
                color="blue"
              >
                Try Again
              </Button>
              
              {showReloadButton && (
                <Button 
                  leftSection={<IconExternalLink size={16} />} 
                  onClick={this.handleReload}
                  variant="light"
                >
                  Reload Page
                </Button>
              )}
              
              {showHomeButton && (
                <Button 
                  leftSection={<IconHome size={16} />} 
                  onClick={this.handleNavigateHome}
                  variant="subtle"
                >
                  Go Home
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>
      );
    }

    // If no error, render children normally
    return children;
  }
}

export default ErrorBoundary;
