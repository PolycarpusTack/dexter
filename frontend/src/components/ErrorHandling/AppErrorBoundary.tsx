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

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
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

  override render(): ReactNode {
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
  const theme = useMantineTheme();
  
  return (
    <Container size="md" py="xl" style={{ backgroundColor: theme.colors.gray[0] }}>
      <Paper withBorder p="xl" radius="md" shadow="md">
        <Stack gap="xl" align="center">
          <Center>
            <Box>
              <ThemeIcon size="xl" radius="xl" color="red">
                <IconBug size={32} />
              </ThemeIcon>
            </Box>
          </Center>
          
          <Title order={2} ta="center">Something went wrong</Title>
          
          <Text ta="center" color="dimmed" size="lg">
            We're sorry, but the application has encountered an error.
            You can try resetting the application or reload the page.
          </Text>
          
          <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error details">
            <Text size="sm">{error.message || 'An unknown error occurred'}</Text>
            {error.stack && (
              <Code block mt="xs" p="xs" style={{ fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' }}>
                {error.stack}
              </Code>
            )}
          </Alert>
          
          <Divider w="100%" />
          
          <Group justify="center" gap="md">
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
          
          <Group gap="xs" justify="center">
            <Text size="xs" color="dimmed">
              If this problem persists, please contact support or
            </Text>
            <Button 
              size="xs" 
              variant="subtle" 
              component="a"
              href="https://github.com/your-org/dexter/issues"
              target="_blank"
              leftSection={<IconBrandGithub size={14} />}
            >
              report the issue
            </Button>
          </Group>
          
          <Alert 
            icon={<IconInfoCircle size={16} />} 
            color="blue" 
            mt="md"
            title="Development Mode"
          >
            <Text size="sm">
              You're running in development mode. Check the console for more detailed error information.
            </Text>
          </Alert>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AppErrorBoundary;
