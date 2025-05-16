import React from 'react';
import { Container } from '@mantine/core';
import { EventTable } from '../components/EventTable/EventTable';

export function EventsPage() {
  return (
    <Container size="xl" py="md">
      <EventTable />
    </Container>
  );
}