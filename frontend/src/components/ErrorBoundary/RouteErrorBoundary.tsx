import React, { Component, ReactNode, ErrorInfo } from 'react';
import { NavigateFunction, useNavigate, useLocation } from 'react-router-dom';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack, 
  Alert,
  Collapse,
  Code,
  ThemeIcon,
  Box,
  Loader,
  Badge,
  ActionIcon
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconRefresh, 
  IconHome, 
  IconArrowLeft,
  IconBug,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCheck
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { logErrorToService } from '../../utils/errorTracking';
import telemetry from '../../services/telemetry';
import { useClipboard } from '@mantine/hooks';

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  isRecovering: boolean;
  showDetails: boolean;
  recoveryAttempts: number;
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableAutoRecovery?: boolean;
  maxRecoveryAttempts?: number;
}

// Higher-order component to inject navigation
function withNavigation<P extends object>(
  Component: React.ComponentType<P & { navigate: NavigateFunction; location: any }>
) {
  return (props: P) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <Component {...props} navigate={navigate} location={location} />;
  };
}

class RouteErrorBoundaryClass extends Component<
  RouteErrorBoundaryProps & { navigate: NavigateFunction; location: any },
  RouteErrorBoundaryState
> {
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(props: RouteErrorBoundaryProps & { navigate: NavigateFunction; location: any }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRecovering: false,
      showDetails: false,
      recoveryAttempts: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { routeName = 'Unknown Route', onError } = this.props;
    
    // Generate error ID for tracking
    const errorId = `route-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Track error with our error tracking service
    logErrorToService(error, {
      component: `RouteErrorBoundary-${routeName}`,
      route: this.props.location.pathname,
      errorInfo: errorInfo.componentStack,
      severity: 'critical'
    });
    
    // Track telemetry
    telemetry.trackCustom('route_error', {
      route: routeName,
      path: this.props.location.pathname,
      errorMessage: error.message,
      errorStack: error.stack,
      errorId
    });
    
    // Update state
    this.setState({ 
      errorInfo, 
      errorId,
      recoveryAttempts: 0 
    });
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRecovery && this.state.recoveryAttempts < (this.props.maxRecoveryAttempts || 3)) {
      this.attemptAutoRecovery();
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  attemptAutoRecovery = () => {
    const { recoveryAttempts } = this.state;
    const { maxRecoveryAttempts = 3 } = this.props;
    
    if (recoveryAttempts >= maxRecoveryAttempts) {
      return;
    }
    
    this.setState({ isRecovering: true });
    
    // Exponential backoff for recovery attempts
    const delay = Math.min(1000 * Math.pow(2, recoveryAttempts), 10000);
    
    this.recoveryTimer = setTimeout(() => {
      telemetry.trackCustom('route_error_recovery_attempt', {
        route: this.props.routeName,
        attempt: recoveryAttempts + 1
      });
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveryAttempts: prevState.recoveryAttempts + 1
      }));
    }, delay);
  };

  handleReset = () => {
    telemetry.trackCustom('route_error_manual_reset', {
      route: this.props.routeName,
      errorId: this.state.errorId
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRecovering: false,
      showDetails: false,
      recoveryAttempts: 0
    });
  };

  handleGoBack = () => {
    telemetry.trackCustom('route_error_go_back', {
      route: this.props.routeName,
      errorId: this.state.errorId
    });
    
    this.props.navigate(-1);
  };

  handleGoHome = () => {
    telemetry.trackCustom('route_error_go_home', {
      route: this.props.routeName,
      errorId: this.state.errorId
    });
    
    this.props.navigate('/');
  };

  handleReportIssue = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      route: this.props.routeName,
      path: this.props.location.pathname,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };
    
    // Track the report action
    telemetry.trackCustom('route_error_report_issue', {
      route: this.props.routeName,
      errorId
    });
    
    // Show notification
    notifications.show({
      title: 'Error Reported',
      message: 'Thank you for reporting this issue. Our team will investigate.',
      color: 'green',
      icon: <IconCheck />
    });
    
    // In production, this would send to an error reporting service
    console.error('Error Report:', errorReport);
  };

  render() {
    const { hasError, error, errorInfo, isRecovering, showDetails, errorId, recoveryAttempts } = this.state;
    const { children, fallback, routeName = 'Unknown Route', maxRecoveryAttempts = 3 } = this.props;

    if (!hasError) {
      return children;
    }

    if (isRecovering) {
      return (
        <Box style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Loader size="lg" />
          <Text size="sm" c="dimmed">Attempting to recover...</Text>
          <Text size="xs" c="dimmed">Attempt {recoveryAttempts + 1} of {maxRecoveryAttempts}</Text>
        </Box>
      );
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Box style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#f8f9fa'
      }}>
        <Paper shadow="lg" p="xl" radius="md" style={{ maxWidth: 600, width: '100%' }}>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group>
                <ThemeIcon size="xl" radius="xl" color="red" variant="light">
                  <IconAlertTriangle size={28} />
                </ThemeIcon>
                <div>
                  <Title order={3}>Route Error</Title>
                  <Text size="sm" c="dimmed">Something went wrong in {routeName}</Text>
                </div>
              </Group>
              {errorId && (
                <Badge size="sm" variant="dot" color="gray">
                  ID: {errorId.slice(-8)}
                </Badge>
              )}
            </Group>

            <Alert 
              icon={<IconBug size={16} />} 
              title="Error Details" 
              color="red"
              variant="light"
            >
              <Text size="sm" fw={500}>{error?.message || 'An unexpected error occurred'}</Text>
              {this.props.location && (
                <Text size="xs" c="dimmed" mt="xs">
                  Path: {this.props.location.pathname}
                </Text>
              )}
            </Alert>

            {recoveryAttempts > 0 && (
              <Alert 
                icon={<IconRefresh size={16} />} 
                color="yellow"
                variant="light"
              >
                <Text size="sm">
                  Automatic recovery failed after {recoveryAttempts} attempt{recoveryAttempts > 1 ? 's' : ''}.
                </Text>
              </Alert>
            )}

            <Group justify="center" gap="sm">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={this.handleReset}
                variant="filled"
              >
                Try Again
              </Button>
              
              <Button
                leftSection={<IconArrowLeft size={16} />}
                onClick={this.handleGoBack}
                variant="light"
              >
                Go Back
              </Button>
              
              <Button
                leftSection={<IconHome size={16} />}
                onClick={this.handleGoHome}
                variant="subtle"
              >
                Go Home
              </Button>
            </Group>

            <Stack gap="xs">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => this.setState({ showDetails: !showDetails })}
                rightSection={showDetails ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>

              <Collapse in={showDetails}>
                <Stack gap="sm">
                  <ErrorDetailsSection
                    title="Error Stack"
                    content={error?.stack || 'No stack trace available'}
                  />
                  
                  {errorInfo?.componentStack && (
                    <ErrorDetailsSection
                      title="Component Stack"
                      content={errorInfo.componentStack}
                    />
                  )}
                  
                  <Button
                    size="sm"
                    variant="light"
                    color="red"
                    leftSection={<IconBug size={16} />}
                    onClick={this.handleReportIssue}
                    fullWidth
                  >
                    Report This Issue
                  </Button>
                </Stack>
              </Collapse>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}

// Component for displaying error details with copy functionality
function ErrorDetailsSection({ title, content }: { title: string; content: string }) {
  const clipboard = useClipboard({ timeout: 2000 });
  
  return (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>{title}</Text>
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={() => clipboard.copy(content)}
        >
          {clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </ActionIcon>
      </Group>
      <Code block style={{ fontSize: '0.75rem', maxHeight: 200, overflow: 'auto' }}>
        {content}
      </Code>
    </Box>
  );
}

// Export the wrapped component
export const RouteErrorBoundary = withNavigation(RouteErrorBoundaryClass);

// Hook for imperatively triggering route errors (useful for testing)
export function useRouteError() {
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return {
    throwError: (error: Error) => setError(error)
  };
}

// HOC for wrapping components with route error boundary
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string,
  options?: Partial<RouteErrorBoundaryProps>
) {
  return (props: P) => (
    <RouteErrorBoundary routeName={routeName} {...options}>
      <Component {...props} />
    </RouteErrorBoundary>
  );
}
