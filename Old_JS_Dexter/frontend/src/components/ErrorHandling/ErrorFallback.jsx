// File: frontend/src/components/ErrorHandling/ErrorFallback.jsx

import React, { useEffect } from 'react';
import { Alert, Group, Text, Code, Stack, Button } from '@mantine/core';
import { IconAlertCircle, IconMessage, IconRefresh } from '@tabler/icons-react';
import { logErrorToService } from '../../utils/errorTracking';
import { ErrorButton } from './components/ErrorButton';
import { RecoveryService } from '../../utils/errorRecovery';

/**
 * Enhanced error fallback component to display when a component throws an error
 * Used with ErrorBoundary components
 */
function ErrorFallback({ 
  error, 
  errorInfo, 
  resetErrorBoundary, 
  executeRecovery,
  errorId,
  boundary = 'component',
  level = 'component',
  showDetails = process.env.NODE_ENV !== 'production'
}) {
  // Track error impact on performance
  useEffect(() => {
    // Start tracking when error occurs
    const startTime = Date.now();
    
    // Log the error to tracking service
    if (error) {
      logErrorToService(error, {
        source: 'ErrorFallback',
        component: boundary,
        level,
        errorId
      });
    }
    
    // Clean up and log metrics when component unmounts or error is fixed
    return () => {
      const duration = Date.now() - startTime;
      console.log(`Error downtime: ${duration}ms`, { error, errorId });
    };
  }, [error, errorId, boundary, level]);
  
  // Determine the recovery strategy based on the error
  const recoveryStrategy = error ? RecoveryService.determineStrategy(error) : 'default';
  
  // Strategy-specific button labels
  const strategyLabels = {
    default: 'Try again',
    auth: 'Log in',
    data: 'Reload data',
    critical: 'Reload page',
    navigate: 'Go to home page'
  };

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Something went wrong"
      color="red"
      variant="filled"
      withCloseButton={false}
    >
      <Stack gap="sm">
        <Text size="sm">
          This component failed to render. This is likely a bug in the application.
        </Text>
        
        {showDetails && error && (
          <Code block style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}>
            {error.message || 'Unknown error'}
          </Code>
        )}
        
        {errorId && showDetails && (
          <Text size="xs" color="gray.2">Error ID: {errorId}</Text>
        )}
        
        <Group position="right" spacing="xs">
          <Button 
            variant="subtle" 
            color="gray" 
            size="xs"
            leftSection={<IconMessage size={14} />}
            onClick={() => window.open('/feedback', '_blank')}
            title="Report this issue to our team"
          >
            Report Issue
          </Button>
          
          {executeRecovery && (
            <ErrorButton 
              onClick={() => executeRecovery(recoveryStrategy)}
              label={strategyLabels[recoveryStrategy]}
              variant="white"
              size="xs"
            />
          )}
          
          {resetErrorBoundary && !executeRecovery && (
            <ErrorButton 
              onClick={resetErrorBoundary}
              variant="white"
              size="xs"
            />
          )}
        </Group>
      </Stack>
    </Alert>
  );
}

export default ErrorFallback;
