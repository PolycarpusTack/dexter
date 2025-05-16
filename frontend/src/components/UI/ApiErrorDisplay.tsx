import React from 'react';
import { Alert, Text, Stack, Button, Group, Box, Code, Paper, Title } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle, IconRefresh, IconSettings } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

interface ApiErrorDisplayProps {
  title?: string;
  message?: string;
  error?: Error | any;
  onRetry?: () => void;
  showConfig?: boolean;
}

export function ApiErrorDisplay({
  title = 'API Connection Error',
  message = 'Failed to connect to the backend server.',
  error,
  onRetry,
  showConfig = true
}: ApiErrorDisplayProps) {
  // Additional details
  const errorDetails = error?.message || 'No additional details available';
  const status = error?.response?.status || (error?.request ? 'Network Error' : 'Unknown Error');
  
  return (
    <Paper p="lg" withBorder shadow="sm">
      <Stack>
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title={title}
          color="red"
          variant="filled"
        >
          {message}
        </Alert>
        
        <Box>
          <Title order={5} mb="xs">Troubleshooting Steps:</Title>
          <Stack gap="xs">
            <Text size="sm">1. Ensure the backend server is running at <Code>http://localhost:8000</Code></Text>
            <Text size="sm">2. Check if you need to configure your organization and project IDs</Text>
            <Text size="sm">3. Verify your API token in the configuration settings</Text>
            <Text size="sm">4. Try refreshing the page or retrying the request</Text>
          </Stack>
        </Box>
        
        {error && (
          <Alert
            icon={<IconInfoCircle size={18} />}
            title="Error Details"
            color="gray"
            variant="light"
          >
            <Text size="sm">Status: {status}</Text>
            <Text size="sm">Message: {errorDetails}</Text>
          </Alert>
        )}
        
        <Group>
          {onRetry && (
            <Button 
              leftSection={<IconRefresh size={16} />} 
              onClick={onRetry} 
              color="blue"
            >
              Retry
            </Button>
          )}
          
          {showConfig && (
            <Button
              component={Link}
              to="/config"
              leftSection={<IconSettings size={16} />}
              variant="outline"
            >
              Configure API Settings
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}