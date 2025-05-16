import React from 'react';
import { Container, Text, Title, Alert, Button, Stack, Code } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react';
import useAppStore from '../store/appStore';
import { api } from '../api/unified';
import { useQuery } from '@tanstack/react-query';

export function TestConfigPage() {
  const { apiToken, organizationId, projectId } = useAppStore();
  
  // Check configuration
  const isConfigured = !!apiToken && !!organizationId && organizationId !== 'default' && 
                      !!projectId && projectId !== 'default';
  
  // Try to fetch actual config from backend
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['config-test'],
    queryFn: () => api.config.getConfig(),
    retry: false
  });
  
  return (
    <Container p="md">
      <Title order={2} mb="xl">Configuration Test</Title>
      
      <Stack spacing="md">
        <Alert 
          color={isConfigured ? "green" : "yellow"} 
          icon={isConfigured ? <IconCircleCheck size={16} /> : <IconAlertCircle size={16} />}
        >
          <Text weight={500}>Configuration Status</Text>
          <Text c="dimmed" size="sm">
            {isConfigured ? "Your configuration is complete" : "Configuration is missing or incomplete"}
          </Text>
        </Alert>
        
        <div>
          <Title order={4} mb="sm">Current Configuration:</Title>
          <Stack spacing="xs">
            <Text>
              <strong>API Token:</strong> {apiToken ? '✓ Set' : '✗ Not set'}
            </Text>
            <Text>
              <strong>Organization ID:</strong> {organizationId || 'Not set'} 
              {organizationId === 'default' && <Text span c="yellow" size="xs"> (default value)</Text>}
            </Text>
            <Text>
              <strong>Project ID:</strong> {projectId || 'Not set'}
              {projectId === 'default' && <Text span c="yellow" size="xs"> (default value)</Text>}
            </Text>
          </Stack>
        </div>
        
        <div>
          <Title order={4} mb="sm">Backend Config Test:</Title>
          {isLoading && <Text c="dimmed">Loading...</Text>}
          {error && (
            <Alert color="red">
              Failed to fetch config: {error.message}
            </Alert>
          )}
          {config && (
            <Code block>
              {JSON.stringify(config, null, 2)}
            </Code>
          )}
        </div>
        
        {!isConfigured && (
          <Button component={Link} to="/config" variant="light">
            Configure Now
          </Button>
        )}
      </Stack>
    </Container>
  );
}