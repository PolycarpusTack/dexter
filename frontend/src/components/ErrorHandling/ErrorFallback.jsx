// File: frontend/src/components/ErrorHandling/ErrorFallback.jsx

import React from 'react';
import { Alert, Button, Group, Text, Code, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { logErrorToService } from '../../utils/errorTracking';

/**
 * Error fallback component to display when a component throws an error
 * Used with ErrorBoundary components
 */
function ErrorFallback({ error, resetErrorBoundary }) {
  // Log the error to our tracking service
  React.useEffect(() => {
    if (error) {
      logErrorToService(error, {
        source: 'ErrorFallback',
        component: 'Unknown', // In a real app, we'd capture component info
      });
    }
  }, [error]);

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
        
        {error && (
          <Code block style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}>
            {error.message || 'Unknown error'}
          </Code>
        )}
        
        <Group position="right">
          {resetErrorBoundary && (
            <Button 
              variant="white" 
              color="red" 
              size="xs"
              onClick={resetErrorBoundary}
            >
              Try again
            </Button>
          )}
        </Group>
      </Stack>
    </Alert>
  );
}

export default ErrorFallback;
