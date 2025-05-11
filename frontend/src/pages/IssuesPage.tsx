// React import required for JSX
import { Container } from '@mantine/core';
import { EventTable } from '../components/EventTable/EventTable';

export function IssuesPage() {
  return (
    <Container size="xl" py="md">
      <EventTable />
    </Container>
  );
}
