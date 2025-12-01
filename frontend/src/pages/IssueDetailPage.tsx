// React import required for JSX
import { useParams } from 'react-router-dom';
import { Container, Stack, Text, Title, Divider } from '@mantine/core';
import { EventDetail } from '../components/EventDetail/EventDetail';
import { EnrichmentTabs } from '../components/Enrichment';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <Container size="md" py="md">
        <Stack align="center" gap="md">
          <Text size="lg" fw={500}>Issue ID is required</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Event Detail Section */}
        <EventDetail eventId={id} />

        <Divider />

        {/* Enrichment Data Section */}
        <Stack gap="md">
          <Title order={3}>Enrichment Data</Title>
          <EnrichmentTabs issueId={id} />
        </Stack>
      </Stack>
    </Container>
  );
}
