// frontend/src/pages/EventsPage.jsx

import React, { useRef } from 'react';
import { 
  Container, 
  Title, 
  Group, 
  Button, 
  Text, 
  Stack,
  Select,
  Paper,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { IconRefresh, IconSettings } from '@tabler/icons-react';
import { useAppStore } from '../store/appStore';
import EventTable from '../components/EventTable/EventTable';
import { useAuditLog } from '../hooks/useAuditLog';

/**
 * Events Page Component
 * 
 * Displays a list of events with the enhanced event table that includes
 * the DeadlockModal functionality.
 */
function EventsPage() {
  const logEvent = useAuditLog('EventsPage');
  const eventTableRef = useRef(null);
  
  // Get organization and project from global state
  const organization = useAppStore(state => state.organization);
  const projects = useAppStore(state => state.projects);
  const [selectedProject, setSelectedProject] = React.useState('');
  const [timeRange, setTimeRange] = React.useState('24h');
  
  // Handle project selection
  const handleProjectChange = (value) => {
    setSelectedProject(value);
    logEvent('change_project', { projectId: value });
  };
  
  // Handle time range selection
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    logEvent('change_time_range', { timeRange: value });
  };
  
  // Handle event selection
  const handleEventSelect = (event) => {
    console.log('Selected event:', event);
    logEvent('select_event', { eventId: event.id });
    // Navigate to event details or show in modal
  };
  
  // Project selector options
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.name
  }));
  
  // Time range options
  const timeRangeOptions = [
    { value: '1h', label: 'Last hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' }
  ];
  
  return (
    <Container size="xl" p="md">
      <Stack spacing="lg">
        <Group position="apart">
          <Title order={3}>Events</Title>
          
          <Group spacing="sm">
            <Select
              placeholder="Select project"
              data={projectOptions}
              value={selectedProject}
              onChange={handleProjectChange}
              style={{ width: 200 }}
              searchable
            />
            
            <Select
              placeholder="Time range"
              data={timeRangeOptions}
              value={timeRange}
              onChange={handleTimeRangeChange}
              style={{ width: 150 }}
            />
            
            <Tooltip label="Refresh">
              <ActionIcon 
                color="blue" 
                variant="light"
                onClick={() => {
                  if (eventTableRef.current) {
                    eventTableRef.current.refresh();
                  }
                  logEvent('refresh_events');
                }}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Settings">
              <ActionIcon variant="light">
                <IconSettings size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        
        {!selectedProject ? (
          <Paper p="xl" withBorder>
            <Stack align="center" spacing="md">
              <Text size="lg" weight={500}>
                Select a project to view events
              </Text>
              <Text color="dimmed" size="sm">
                Choose a project from the dropdown above to view its events.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <EventTable
            projectId={selectedProject}
            timeRange={timeRange}
            onEventSelect={handleEventSelect}
            ref={eventTableRef}
            showFilters={true}
            maxItems={25}
            autoRefresh={false}
          />
        )}
      </Stack>
    </Container>
  );
}

export default EventsPage;
