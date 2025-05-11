import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Paper, Text, Title, Container, Group, Stack } from '@mantine/core';
import { IconRefresh, IconBug, IconAlertCircle } from '@tabler/icons-react';
import { handleApiError } from '../../utils/apiErrorHandler';
import { Logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error
    Logger.error('Error boundary caught an error', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Handle API errors specially
    if (this.isApiError(error)) {
      handleApiError(error, {
        context: {
          component: 'ErrorBoundary',
          componentStack: errorInfo.componentStack
        }
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && resetKeys) {
      let shouldReset = false;
      for (const key of resetKeys) {
        if (prevProps[key as keyof Props] !== this.props[key as keyof Props]) {
          shouldReset = true;
          break;
        }
      }

      if (shouldReset) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private isApiError(error: Error): boolean {
    // Check if error is from API (has response property or specific error types)
    return 'response' in error || 
           error.message.includes('fetch') || 
           error.message.includes('Network');
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      this.setState({ retryCount: retryCount + 1 });
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      this.retryTimeout = window.setTimeout(() => {
        this.resetError();
      }, delay);
    }
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    
    if (error) {
      // Report error to error tracking service
      Logger.error('User reported error', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Show confirmation
      handleApiError(new Error('Error report submitted successfully'), {
        userMessage: 'Thank you for reporting this error. Our team will investigate.',
        logLevel: 'info',
        silent: false
      });
    }
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <Container size="sm" py="xl">
          <Paper p="xl" shadow="sm" withBorder>
            <Stack spacing="md" align="center">
              <IconAlertCircle size={48} color="red" />
              
              <Title order={2} align="center">
                Something went wrong
              </Title>
              
              <Text align="center" color="dimmed">
                We're sorry for the inconvenience. An unexpected error occurred.
              </Text>

              {error && (
                <Paper p="md" bg="gray.0" radius="sm" w="100%">
                  <Text size="sm" color="red" style={{ wordBreak: 'break-word' }}>
                    {error.message}
                  </Text>
                </Paper>
              )}

              <Group position="center" mt="md">
                <Button
                  leftIcon={<IconRefresh size={16} />}
                  onClick={this.handleRetry}
                  disabled={retryCount >= this.maxRetries}
                >
                  {retryCount > 0 ? `Retry (${retryCount}/${this.maxRetries})` : 'Try Again'}
                </Button>
                
                <Button
                  variant="light"
                  leftIcon={<IconBug size={16} />}
                  onClick={this.handleReportError}
                >
                  Report Error
                </Button>
              </Group>

              <Text size="xs" color="dimmed" align="center">
                If the problem persists, please contact support.
              </Text>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return children;
  }
}

// HOC for adding error boundary to components
export function withEnhancedErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
): React.FC<P> {
  const ComponentWithErrorBoundary = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </EnhancedErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withEnhancedErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithErrorBoundary;
}
