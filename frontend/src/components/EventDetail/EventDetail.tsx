import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paper, Stack, Title, Text, Badge, Group, Tabs, LoadingOverlay } from '@mantine/core';
import { IconBug, IconClock, IconUser } from '@tabler/icons-react';
import { apiClient } from '../../api/apiClient';

interface EventDetailProps {
  eventId: string;
}

export const EventDetail: React.FC<EventDetailProps> = ({ eventId }) => {
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => apiClient.get(`/api/events/${eventId}`),
  });

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!event) {
    return (
      <Paper p="md">
        <Text>Event not found</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>{event.title}</Title>
            <Badge color={event.level === 'error' ? 'red' : 'yellow'}>
              {event.level}
            </Badge>
          </Group>
          
          <Group gap="xl">
            <Group gap="xs">
              <IconBug size={16} />
              <Text size="sm">{event.platform}</Text>
            </Group>
            <Group gap="xs">
              <IconClock size={16} />
              <Text size="sm">{new Date(event.dateCreated).toLocaleString()}</Text>
            </Group>
            {event.user && (
              <Group gap="xs">
                <IconUser size={16} />
                <Text size="sm">{event.user.email || event.user.username || 'Unknown'}</Text>
              </Group>
            )}
          </Group>
        </Stack>
      </Paper>

      <Tabs defaultValue="stacktrace">
        <Tabs.List>
          <Tabs.Tab value="stacktrace">Stack Trace</Tabs.Tab>
          <Tabs.Tab value="breadcrumbs">Breadcrumbs</Tabs.Tab>
          <Tabs.Tab value="context">Context</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="stacktrace" pt="md">
          <Paper p="md" withBorder>
            <pre>{JSON.stringify(event.entries?.find((e: any) => e.type === 'stacktrace'), null, 2)}</pre>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="breadcrumbs" pt="md">
          <Paper p="md" withBorder>
            <pre>{JSON.stringify(event.entries?.find((e: any) => e.type === 'breadcrumbs'), null, 2)}</pre>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="context" pt="md">
          <Paper p="md" withBorder>
            <pre>{JSON.stringify(event.contexts, null, 2)}</pre>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
