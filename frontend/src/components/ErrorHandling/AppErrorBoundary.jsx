// File: frontend/src/components/ErrorHandling/AppErrorBoundary.jsx

import React from 'react';
import { 
  Box, 
  Text, 
  Button, 
  Title, 
  Stack,
  Group,
  Code,
  Paper
} from '@mantine/core';
import { logErrorToService } from '../../utils/errorTracking';
import { IconRefresh, IconBug } from '@tabler/icons-react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Fallback component to display when the application encounters an error
 */
function AppErrorFallback({ error, errorInfo, resetErrorBoundary }) {
  // Log the error to our tracking service
  React.useEffect(() => {
    if (error) {
      logErrorToService(error, {
        source: 'AppErrorBoundary',
        severity: 'critical',
        componentStack: errorInfo?.componentStack
      });
    }
  }, [error, errorInfo]);

  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#f9fafb'
      }}
    >
      <Paper withBorder p="xl" radius="md" shadow="md" sx={{ maxWidth: 600 }}>
        <Stack spacing="md">
          <Group position="center" mb="lg">
            <IconBug size={64} color="#fa5252" />
          </Group>
          
          <Title order={2} align="center" color="red">
            Something went wrong
          </Title>
          
          <Text align="center" size="lg" mb="md">
            Dexter has encountered an unexpected error.
          </Text>
          
          {error && (
            <Code block maw={560} mx="auto" sx={{ overflow: 'auto' }}>
              {error.message || 'Unknown error'}
            </Code>
          )}
          
          <Group position="center" mt="xl">
            <Button 
              leftIcon={<IconRefresh size={18} />}
              color="red"
              onClick={resetErrorBoundary}
              size="md"
            >
              Try again
            </Button>
          </Group>
          
          <Text size="sm" color="dimmed" align="center" mt="md">
            If this problem persists, please contact the development team.
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}

/**
 * Application-level error boundary to catch uncaught errors
 */
function AppErrorBoundary({ children }) {
  const handleError = (error, info) => {
    console.error('App Error Boundary caught an error:', error);
    console.error('Component Stack:', info?.componentStack);
    
    logErrorToService(error, {
      source: 'AppErrorBoundary',
      componentStack: info?.componentStack,
      severity: 'critical',
    });
  };

  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={handleError}
      onReset={() => {
        // Optional: add any cleanup or state reset logic here
        console.log('Error boundary reset');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default AppErrorBoundary;
