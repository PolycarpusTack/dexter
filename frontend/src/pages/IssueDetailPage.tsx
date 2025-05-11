// React import required for JSX
import { useParams } from 'react-router-dom';
import { Container, Stack, Text } from '@mantine/core';
import { EventDetail } from '../components/EventDetail/EventDetail';

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
      <EventDetail eventId={id} />
    </Container>
  );
}
