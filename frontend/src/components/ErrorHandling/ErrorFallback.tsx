// File: src/components/ErrorHandling/ErrorFallback.tsx

import React, { useState } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack,
  Accordion,
  Alert,
  Box,
  Code,
  Divider,
  ThemeIcon
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconRefresh, 
  IconArrowBack, 
  IconBug,
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react';
import { ErrorFallbackProps } from '../../types/errorHandling';

/**
 * Default error fallback UI component
 * 
 * Displays error information and provides reset functionality
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError,
  showDetails = true
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Format error message
  const errorMessage = error?.message || 'An unknown error occurred';
  
  // Get error name or default to 'Error'
  const errorName = error?.name || 'Error';
  
  // Extract stack trace
  const stackTrace = error?.stack?.split('\n').slice(1).join('\n') || '';
  
  // Determine if we have an API error with status code
  const isApiError = 'status' in error;
  const statusCode = isApiError ? (error as any).status : null;
  
  // Map status code to descriptive text
  const getStatusText = (code: number): string => {
    switch (code) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 500: return 'Internal Server Error';
      case 503: return 'Service Unavailable';
      default: return `Error ${code}`;
    }
  };
  
  return (
    <Paper withBorder p="md" radius="md" shadow="md">
      <Stack spacing="md">
        <Group spacing="xs">
          <ThemeIcon color="red" size="lg" radius="xl">
            <IconAlertCircle size={24} />
          </ThemeIcon>
          <Title order={4}>Something went wrong</Title>
        </Group>
        
        <Alert color="red" icon={<IconBug size={16} />} title={errorName}>
          {errorMessage}
          
          {/* Show API status if available */}
          {isApiError && statusCode && (
            <Text size="sm" mt="xs">
              Status: {statusCode} ({getStatusText(statusCode)})
            </Text>
          )}
        </Alert>
        
        <Group position="apart">
          <Button 
            leftSection={<IconRefresh size={16} />}
            onClick={resetError}
            color="blue"
          >
            Try Again
          </Button>
          
          {showDetails && (
            <Button 
              variant="subtle"
              rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              onClick={() => setExpanded(!expanded)}
              color="gray"
            >
              {expanded ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
        </Group>
        
        {/* Technical details section */}
        {showDetails && expanded && (
          <Box mt="md">
            <Divider label="Technical Details" labelPosition="center" mb="md" />
            
            <Accordion defaultValue="info">
              <Accordion.Item value="info">
                <Accordion.Control>Error Information</Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="xs">
                    <Group>
                      <Text size="sm" fw={500} style={{ width: 100 }}>Type:</Text>
                      <Text size="sm">{errorName}</Text>
                    </Group>
                    <Group>
                      <Text size="sm" fw={500} style={{ width: 100 }}>Message:</Text>
                      <Text size="sm">{errorMessage}</Text>
                    </Group>
                    {isApiError && statusCode && (
                      <Group>
                        <Text size="sm" fw={500} style={{ width: 100 }}>Status:</Text>
                        <Text size="sm">{statusCode} ({getStatusText(statusCode)})</Text>
                      </Group>
                    )}
                    {'metadata' in error && (error as any).metadata && (
                      <Group>
                        <Text size="sm" fw={500} style={{ width: 100 }}>Metadata:</Text>
                        <Code>{JSON.stringify((error as any).metadata, null, 2)}</Code>
                      </Group>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
              
              <Accordion.Item value="stack">
                <Accordion.Control>Stack Trace</Accordion.Control>
                <Accordion.Panel>
                  <Box component="pre" style={{ 
                    maxHeight: 300, 
                    overflow: 'auto', 
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f6f6f6',
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    {stackTrace || 'No stack trace available'}
                  </Box>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default ErrorFallback;
