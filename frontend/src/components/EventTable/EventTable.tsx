import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, ScrollArea, Group, Badge, Text, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { apiClient } from '../../api/apiClient';

export interface EventTableProps {
  filters?: any;
  onRowClick?: (event: any) => void;
  refreshInterval?: number;
  optimized?: boolean;
  onEventUpdate?: (event: any) => void;
  onExport?: (data: any) => void;
  virtualized?: boolean;
}

const EventTable = React.forwardRef<any, EventTableProps>(({ filters, onRowClick }, ref) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => apiClient.get('/api/events', { params: filters }),
  });

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!events || events.length === 0) {
    return (
      <Text c="dimmed" ta="center" p="xl">
        No events found. Try adjusting your filters.
      </Text>
    );
  }

  return (
    <ScrollArea>
      <Table striped highlightOnHover ref={ref}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Level</th>
            <th>Platform</th>
            <th>Count</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events?.map((event: any) => (
            <tr key={event.id} onClick={() => onRowClick?.(event)} style={{ cursor: 'pointer' }}>
              <td>{event.title}</td>
              <td>
                <Badge color={event.level === 'error' ? 'red' : 'yellow'}>
                  {event.level}
                </Badge>
              </td>
              <td>{event.platform}</td>
              <td>{event.count}</td>
              <td>{new Date(event.lastSeen).toLocaleString()}</td>
              <td>
                <Group>
                  <ActionIcon variant="subtle">
                    <IconExternalLink size={16} />
                  </ActionIcon>
                </Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </ScrollArea>
  );
});

EventTable.displayName = 'EventTable';

export { EventTable };
export default EventTable;
