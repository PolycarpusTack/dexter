import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Paper, Text, Title, Container, Group, Stack, Badge, Divider } from '@mantine/core';
import { IconRefresh, IconBug, IconAlertCircle, IconArrowBack, IconHome } from '@tabler/icons-react';
import { handleApiError } from '../../utils/apiErrorHandler';
import { Logger } from '../../utils/logger';
import errorTracker, { ErrorCategory, ErrorSeverity, RecoveryStrategy } from '../../utils/errorHandling/errorTracker';
import telemetry from '../../services/telemetry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  component?: string;
  telemetryEnabled?: boolean;
  showErrorDetails?: boolean;
  maxRetries?: number;
  redirectOnFailure?: string;
  errorCategory?: ErrorCategory;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId?: string;
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeout: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      recoveryAttempted: false,
      recoverySuccess: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track in error tracker
    const category = this.determineErrorCategory(error);
    const errorId = this.trackError(error, errorInfo, category);
    
    this.setState({ 
      errorInfo,
      errorId
    });

    // Log error
    Logger.error('Error boundary caught an error', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      category
    });

    // Handle API errors specially
    if (this.isApiError(error)) {
      handleApiError(error, {
        context: {
          component: this.props.component || 'ErrorBoundary',
          componentStack: errorInfo.componentStack,
          errorId
        }
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Attempt automatic recovery
    this.attemptRecovery(error, errorId);
  }

  override componentDidUpdate(prevProps: Props) {
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

  override componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private isApiError(error: Error): boolean {
    // Check if error is from API (has response property or specific error types)
    return 'response' in error || 
           error.message.includes('fetch') || 
           error.message.includes('Network') ||
           error.message.includes('timeout') ||
           error.message.includes('API');
  }
  
  private determineErrorCategory(error: Error): ErrorCategory {
    // Use provided category if available
    if (this.props.errorCategory) {
      return this.props.errorCategory;
    }
    
    // Determine category based on error properties and message
    if (this.isApiError(error)) {
      return ErrorCategory.API;
    }
    
    if (error.message.includes('render') || 
        error.message.includes('component') ||
        error.message.includes('React') ||
        error.message.includes('props') ||
        error.message.includes('state') ||
        error.message.includes('element')) {
      return ErrorCategory.RENDERING;
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  private trackError(error: Error, errorInfo: ErrorInfo, category: ErrorCategory): string {
    if (this.props.telemetryEnabled === false) {
      return 'telemetry-disabled';
    }
    
    // Track error in error tracker
    const trackedError = errorTracker.trackError(error, {
      category,
      component: this.props.component || 'ErrorBoundary',
      severity: ErrorSeverity.ERROR,
      recoverable: true,
      retryable: true,
      maxRetries: this.props.maxRetries || 3,
      context: {
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
    
    return trackedError.id;
  }
  
  private attemptRecovery(error: Error, errorId: string): void {
    // Don't attempt recovery if it's not a recoverable error
    if (error instanceof TypeError || 
        error instanceof SyntaxError ||
        error.message.includes('Invalid hook') ||
        error.message.includes('internal React error')) {
      this.setState({
        recoveryAttempted: true,
        recoverySuccess: false
      });
      return;
    }
    
    // Try to recover automatically for some error types
    if (this.isApiError(error)) {
      const trackedError = errorTracker.getError(errorId);
      
      if (trackedError && trackedError.recoveryStrategy === RecoveryStrategy.RETRY) {
        // Schedule automatic retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
        
        this.retryTimeout = window.setTimeout(() => {
          this.handleRetry();
        }, delay);
        
        this.setState({
          recoveryAttempted: true,
          recoverySuccess: true
        });
      }
    }
  }

  private resetError = () => {
    // Resolve error in tracker if we have an ID
    if (this.state.errorId) {
      errorTracker.resolveError(this.state.errorId, 'manual_reset');
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempted: false,
      recoverySuccess: false
    });
    
    // Track reset in telemetry
    if (this.props.telemetryEnabled !== false) {
      telemetry.trackInteraction({
        name: 'Error boundary reset',
        category: 'error',
        component: this.props.component || 'ErrorBoundary',
        details: {
          errorId: this.state.errorId,
          errorMessage: this.state.error?.message,
          retryCount: this.state.retryCount
        }
      });
    }
  };

  private handleRetry = () => {
    const { retryCount, errorId } = this.state;
    const maxRetries = this.props.maxRetries || 3;

    if (retryCount < maxRetries) {
      this.setState({ retryCount: retryCount + 1 });
      
      // Track retry in telemetry
      if (this.props.telemetryEnabled !== false) {
        telemetry.trackInteraction({
          name: 'Error boundary retry',
          category: 'error',
          component: this.props.component || 'ErrorBoundary',
          details: {
            errorId,
            retryCount: retryCount + 1,
            maxRetries
          }
        });
      }
      
      // Try retry through error tracker if we have an error ID
      if (errorId) {
        const retryResult = errorTracker.retryError(errorId);
        
        if (retryResult) {
          // If retry was successful through error tracker, reset the error
          this.resetError();
          return;
        }
      }
      
      // Fall back to manual retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      this.retryTimeout = window.setTimeout(() => {
        this.resetError();
      }, delay);
    }
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (error) {
      // Track in telemetry
      if (this.props.telemetryEnabled !== false) {
        telemetry.trackInteraction({
          name: 'Error reported by user',
          category: 'error',
          component: this.props.component || 'ErrorBoundary',
          details: {
            errorId,
            errorMessage: error.message,
            userInitiated: true
          }
        });
      }
      
      // Report error with additional context
      Logger.error('User reported error', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId,
        userInitiated: true
      });

      // Show confirmation
      handleApiError(new Error('Error report submitted successfully'), {
        userMessage: 'Thank you for reporting this error. Our team will investigate.',
        logLevel: 'info',
        silent: false
      });
    }
  };
  
  private handleGoHome = () => {
    // Navigate to home
    window.location.href = '/';
    
    // Track in telemetry
    if (this.props.telemetryEnabled !== false) {
      telemetry.trackNavigation({
        from: window.location.pathname,
        to: '/',
        method: 'programmatic'
      });
    }
  };
  
  private handleGoBack = () => {
    // Go back in history
    window.history.back();
    
    // Track in telemetry
    if (this.props.telemetryEnabled !== false) {
      telemetry.trackInteraction({
        name: 'Error boundary go back',
        category: 'navigation',
        component: this.props.component || 'ErrorBoundary',
        details: {
          errorId: this.state.errorId,
          fromUrl: window.location.href
        }
      });
    }
  };

  override render() {
    const { hasError, error, retryCount, errorId, recoveryAttempted } = this.state;
    const { children, fallback, maxRetries = 3, showErrorDetails = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <Container size="sm" py="xl">
          <Paper p="xl" shadow="sm" withBorder>
            <Stack gap="md" align="center">
              <IconAlertCircle size={48} color="red" />
              
              <Title order={2} ta="center">
                Something went wrong
              </Title>
              
              <Text ta="center" c="dimmed">
                We're sorry for the inconvenience. An unexpected error occurred.
              </Text>

              {errorId && (
                <Badge color="gray" size="sm" radius="sm">
                  Error ID: {errorId.substring(0, 8)}
                </Badge>
              )}

              {recoveryAttempted && (
                <Text size="sm" c="dimmed" ta="center">
                  Automatic recovery {this.state.recoverySuccess ? 'in progress...' : 'failed'}
                </Text>
              )}

              {error && showErrorDetails && (
                <Paper p="md" bg="gray.0" radius="sm" w="100%">
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={500}>Error Details</Text>
                    <Badge color="red" size="xs">
                      {this.determineErrorCategory(error)}
                    </Badge>
                  </Group>
                  <Text size="sm" c="red" style={{ wordBreak: 'break-word' }}>
                    {error.message}
                  </Text>
                </Paper>
              )}

              <Divider my="md" />
              
              <Group justify="center">
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={this.handleRetry}
                  disabled={retryCount >= maxRetries}
                >
                  {retryCount > 0 ? `Retry (${retryCount}/${maxRetries})` : 'Try Again'}
                </Button>
                
                <Button
                  variant="light"
                  leftSection={<IconBug size={16} />}
                  onClick={this.handleReportError}
                >
                  Report Error
                </Button>
              </Group>
              
              <Group justify="center">
                <Button
                  variant="subtle"
                  leftSection={<IconArrowBack size={16} />}
                  onClick={this.handleGoBack}
                >
                  Go Back
                </Button>
                
                <Button
                  variant="subtle"
                  leftSection={<IconHome size={16} />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              </Group>

              <Text size="xs" c="dimmed" ta="center">
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
  // Default component name for error tracking
  const componentName = 
    WrappedComponent.displayName || 
    WrappedComponent.name || 
    'Component';
    
  // Set component name in error boundary props
  const mergedProps: Partial<Props> = {
    component: componentName,
    ...errorBoundaryProps
  };
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
