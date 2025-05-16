import React, { useEffect } from 'react';
import { Container, Text, Paper, Stack, Title, Alert } from '@mantine/core';
import { EventTable } from '../components/EventTable/EventTable';
import useAppStore from '../store/appStore';
import { IconInfoCircle } from '@tabler/icons-react';

export default function DashboardPage() {
  const { organizationId, projectId, setOrganizationId, setProjectId } = useAppStore();

  // Set default organization and project if not set
  useEffect(() => {
    if (!organizationId) {
      setOrganizationId('org-slug');
    }
    if (!projectId) {
      setProjectId('project-slug');
    }
  }, [organizationId, projectId, setOrganizationId, setProjectId]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper p="lg" shadow="xs">
          <Title order={2} mb="md">Dashboard</Title>
          {(!organizationId || !projectId) && (
            <Alert icon={<IconInfoCircle size={16} />} mb="md" color="yellow">
              Organization and project are not configured. Using default values.
            </Alert>
          )}
          <Text c="dimmed" size="sm" mb="md">
            Organization: {organizationId || 'Not set'} | Project: {projectId || 'Not set'}
          </Text>
          <EventTable 
            organizationId={organizationId} 
            projectId={projectId}
          />
        </Paper>
      </Stack>
    </Container>
  );
}