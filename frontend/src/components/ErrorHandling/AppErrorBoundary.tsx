// File: src/components/ErrorHandling/AppErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack,
  Center,
  Box,
  Container,
  Divider,
  ThemeIcon,
  Code,
  useMantineTheme,
  Alert
} from '@mantine/core';
import { 
  IconBug, 
  IconAlertCircle, 
  IconRefresh, 
  IconInfoCircle,
  IconBrandGithub
} from '@tabler/icons-react';
import { ErrorBoundaryState } from '../../types/errorHandling';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Top-level application error boundary
 * 
 * Catches errors in the entire app and displays a user-friendly error screen
 * with the option to recover or reload the application
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('Application Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Here you could also log to an error tracking service
  }
  
  // Reset error state to try to recover
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };
  
  // Force reload the application
  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <AppErrorFallback error={this.state.error!} onReset={this.handleReset} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

interface AppErrorFallbackProps {
  error: Error;
  onReset: () => void;
  onReload: () => void;
}

/**
 * Application-level error fallback component
 */
const AppErrorFallback: React.FC<AppErrorFallbackProps> = ({ error, onReset, onReload }) => {
  return (
    <Container size="md" py="xl">
      <Paper withBorder p="xl" radius="md" shadow="md">
        <Stack spacing="xl" align="center">
          <ThemeIcon size="xl" radius="xl" color="red">
            <IconBug size={32} />
          </ThemeIcon>
          
          <Title order={2} align="center">Something went wrong</Title>
          
          <Text align="center" color="dimmed" size="lg">
            We're sorry, but the application has encountered an error.
            You can try resetting the application or reload the page.
          </Text>
          
          <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error details">
            <Text size="sm">{error.message || 'An unknown error occurred'}</Text>
          </Alert>
          
          <Divider w="100%" />
          
          <Group position="center" spacing="md">
            <Button 
              leftSection={<IconRefresh size={16} />}
              onClick={onReset}
              variant="outline"
              color="blue"
            >
              Try to Recover
            </Button>
            
            <Button 
              onClick={onReload}
              color="red"
            >
              Reload Application
            </Button>
          </Group>
          
          <Text size="xs" color="dimmed">
            If this problem persists, please contact support or report the issue.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AppErrorBoundary;
