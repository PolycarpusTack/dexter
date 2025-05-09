// File: frontend/src/components/ErrorHandling/AppErrorBoundary.jsx

import React, { useEffect } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  Title, 
  Stack,
  Group,
  Code,
  Paper,
  Divider
} from '@mantine/core';
import { IconRefresh, IconBug, IconMessage, IconHome } from '@tabler/icons-react';
import { logErrorToService } from '../../utils/errorTracking';
import { RecoveryService } from '../../utils/errorRecovery';
import ErrorBoundary from './ErrorBoundary';
import { ErrorButton } from './components/ErrorButton';

/**
 * Enhanced fallback component to display when the application encounters an error
 */
function AppErrorFallback({ 
  error, 
  errorInfo, 
  resetErrorBoundary,
  executeRecovery,
  errorId,
  showDetails = process.env.NODE_ENV !== 'production'
}) {
  // Track error impact on performance
  useEffect(() => {
    const startTime = Date.now();
    
    // Log the error to our tracking service
    if (error) {
      logErrorToService(error, {
        source: 'AppErrorBoundary',
        severity: 'critical',
        componentStack: errorInfo?.componentStack,
        errorId
      });
    }
    
    // Return cleanup function to measure downtime
    return () => {
      const duration = Date.now() - startTime;
      console.log(`App error downtime: ${duration}ms`, { error, errorId });
    };
  }, [error, errorInfo, errorId]);

  // Determine the recovery strategy based on the error
  const recoveryStrategy = error ? RecoveryService.determineStrategy(error) : 'default';
  
  // Strategy-specific button labels
  const strategyLabels = {
    default: 'Try again',
    auth: 'Go to login',
    data: 'Reload data',
    critical: 'Reload application',
    navigate: 'Go to home page'
  };

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
          
          {showDetails && error && (
            <Code block maw={560} mx="auto" sx={{ overflow: 'auto' }}>
              {error.message || 'Unknown error'}
            </Code>
          )}
          
          {errorId && showDetails && (
            <Text size="sm" color="dimmed" align="center">
              Error ID: {errorId}
            </Text>
          )}
          
          <Divider my="sm" />
          
          <Group position="center" spacing="md" mt="md">
            <Button 
              leftSection={<IconHome size={18} />}
              variant="subtle"
              color="gray"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
            
            <Button 
              leftSection={<IconMessage size={18} />}
              variant="outline"
              color="blue"
              onClick={() => window.open('/feedback', '_blank')}
            >
              Report Issue
            </Button>
            
            {executeRecovery && (
              <ErrorButton 
                onClick={() => executeRecovery(recoveryStrategy)}
                label={strategyLabels[recoveryStrategy]}
                size="md"
              />
            )}
            
            {resetErrorBoundary && !executeRecovery && (
              <ErrorButton 
                onClick={resetErrorBoundary}
                size="md"
              />
            )}
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
 * Enhanced application-level error boundary to catch uncaught errors
 */
function AppErrorBoundary({ children }) {
  const handleError = (error, info, errorId) => {
    console.error('App Error Boundary caught an error:', error);
    console.error('Component Stack:', info?.componentStack);
    
    logErrorToService(error, {
      source: 'AppErrorBoundary',
      componentStack: info?.componentStack,
      severity: 'critical',
      errorId,
      route: window.location.pathname,
      // Add additional context that might be helpful
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <ErrorBoundary
      name="AppErrorBoundary"
      level="application"
      FallbackComponent={AppErrorFallback}
      onError={handleError}
      onReset={() => {
        // Optional: add any cleanup or state reset logic here
        console.log('App error boundary reset');
      }}
      recoveryStrategy="critical" // Default to critical for app-level errors
    >
      {children}
    </ErrorBoundary>
  );
}

export default AppErrorBoundary;
