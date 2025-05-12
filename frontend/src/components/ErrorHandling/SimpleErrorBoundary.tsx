import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Paper, Text, Button, Group, Box } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A simple error boundary component that catches errors in its children
 * and displays a fallback UI with a reset button
 */
export class SimpleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Error caught by SimpleErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null
    });

    // Call the onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallbackMessage } = this.props;

    if (hasError) {
      // Fallback UI
      return (
        <Paper p="md" withBorder shadow="sm">
          <Group mb="md">
            <IconAlertCircle size={24} color="red" />
            <Text fw={600} size="lg" color="red">
              Something went wrong
            </Text>
          </Group>
          
          <Text mb="md">
            {fallbackMessage || 'An error occurred while rendering this component.'}
          </Text>
          
          {error && (
            <Box 
              mb="md" 
              p="xs" 
              style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto'
              }}
            >
              <Text color="dimmed" size="sm">{error.toString()}</Text>
            </Box>
          )}
          
          <Button 
            leftSection={<IconRefresh size={14} />} 
            onClick={this.handleReset}
            size="sm"
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return children;
  }
}

export default SimpleErrorBoundary;
