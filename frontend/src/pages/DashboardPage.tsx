import React, { useEffect } from 'react';
import { Container, Text, Paper, Stack, Title, Alert } from '@mantine/core';
import { EventTable } from '../components/EventTable/EventTable';
import { useAuthStore } from '../store';
import { IconInfoCircle } from '@tabler/icons-react';

export default function DashboardPage() {
  const { organizationId, projectSlug, setOrganizationId, setProjectSlugId } = useAuthStore();

  // Set default organization and project if not set
  useEffect(() => {
    if (!organizationId) {
      setOrganizationId('org-slug');
    }
    if (!projectSlug) {
      setProjectSlugId('project-slug');
    }
  }, [organizationId, projectSlug, setOrganizationId, setProjectSlugId]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper p="lg" shadow="xs">
          <Title order={2} mb="md">Dashboard</Title>
          {(!organizationId || !projectSlug) && (
            <Alert icon={<IconInfoCircle size={16} />} mb="md" color="yellow">
              Organization and project are not configured. Using default values.
            </Alert>
          )}
          <Text c="dimmed" size="sm" mb="md">
            Organization: {organizationId || 'Not set'} | Project: {projectSlug || 'Not set'}
          </Text>
          <EventTable 
            organizationId={organizationId} 
            projectSlug={projectSlug}
            filters={{ useIssues: true }}
          />
        </Paper>
      </Stack>
    </Container>
  );
}