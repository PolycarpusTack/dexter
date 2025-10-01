import React from 'react';
import { Container, Title, Paper, Text, Stack, Button, Group, Badge } from '@mantine/core';
import { IconDatabase, IconRefresh } from '@tabler/icons-react';
import EnhancedDeadlockDisplay from '../components/DeadlockDisplay/EnhancedDeadlockDisplay';

/**
 * Test page for deadlock visualization
 */
export default function DeadlockTestPage() {
  // Sample deadlock event for testing
  const sampleDeadlockEvent = {
    id: 'test-deadlock-123',
    title: 'OperationalError: deadlock detected',
    message: `ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on relation 16385 of database 12345; blocked by process 12346.
Process 12346 waits for ShareLock on relation 16386 of database 12345; blocked by process 12345.
HINT: See server log for query details.
Process 12345: UPDATE users SET last_active = NOW() WHERE id = 123;
Process 12346: UPDATE accounts SET balance = balance - 100 WHERE user_id = 123;`,
    platform: 'python',
    environment: 'production',
    timestamp: new Date().toISOString(),
    exception: {
      values: [{
        type: 'OperationalError',
        value: 'deadlock detected',
        mechanism: {
          type: 'postgresql',
          handled: false
        }
      }]
    },
    tags: [
      { key: 'database.type', value: 'postgresql' },
      { key: 'error.type', value: 'deadlock' },
      { key: 'sql_state', value: '40P01' }
    ],
    contexts: {
      database: {
        name: 'production_db',
        type: 'postgresql',
        version: '14.5'
      }
    },
    projectSlug: 'test-project',
    project: {
      slug: 'test-project',
      name: 'Test Project'
    }
  };

  const [eventDetails, setEventDetails] = React.useState(sampleDeadlockEvent);

  const handleRefresh = () => {
    // Simulate refreshing event data
    setEventDetails({
      ...sampleDeadlockEvent,
      timestamp: new Date().toISOString(),
      id: `test-deadlock-${Date.now()}`
    });
  };

  return (
    <Container size="xl" py="xl">
      <Stack spacing="lg">
        <Group position="apart" align="center">
          <Group spacing="md">
            <IconDatabase size={32} />
            <div>
              <Title order={1}>Deadlock Visualization Test</Title>
              <Text size="sm" color="dimmed">
                Test the PostgreSQL deadlock analyzer and visualization
              </Text>
            </div>
          </Group>
          <Button 
            leftIcon={<IconRefresh size={16} />}
            onClick={handleRefresh}
            variant="light"
          >
            Refresh Event
          </Button>
        </Group>

        <Paper withBorder p="md" radius="md">
          <Stack spacing="xs">
            <Group spacing="xs">
              <Text fw={600}>Test Event Details</Text>
              <Badge color="red">40P01</Badge>
              <Badge color="orange">Production</Badge>
            </Group>
            <Text size="sm" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
              {eventDetails.message}
            </Text>
          </Stack>
        </Paper>

        <EnhancedDeadlockDisplay 
          eventId={eventDetails.id}
          eventDetails={eventDetails}
        />

        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Title order={3} mb="sm">About This Test</Title>
          <Stack spacing="xs">
            <Text size="sm">
              This page demonstrates the deadlock visualization component with a sample PostgreSQL deadlock event.
            </Text>
            <Text size="sm">
              The visualization shows:
            </Text>
            <ul style={{ marginTop: 0, paddingLeft: 20 }}>
              <li><Text size="sm">Process dependencies as nodes in a graph</Text></li>
              <li><Text size="sm">Lock relationships as edges between nodes</Text></li>
              <li><Text size="sm">Deadlock cycles highlighted in red</Text></li>
              <li><Text size="sm">Interactive zoom, pan, and hover details</Text></li>
              <li><Text size="sm">AI-powered recommendations for resolution</Text></li>
            </ul>
            <Text size="sm" fw={600}>
              Try:
            </Text>
            <ul style={{ marginTop: 0, paddingLeft: 20 }}>
              <li><Text size="sm">Hovering over nodes and edges for details</Text></li>
              <li><Text size="sm">Dragging nodes to rearrange the graph</Text></li>
              <li><Text size="sm">Using zoom controls or scroll wheel</Text></li>
              <li><Text size="sm">Switching between graph, tables, and recommendations tabs</Text></li>
              <li><Text size="sm">Exporting the visualization as SVG</Text></li>
            </ul>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}