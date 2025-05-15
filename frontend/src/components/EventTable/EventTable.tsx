import React, { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, ScrollArea, Group, Badge, Text, ActionIcon, LoadingOverlay, Box } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { api } from '../../api/unified';
import useAppStore from '../../store/appStore';
import useTableKeyboardNavigation from '../../hooks/useTableKeyboardNavigation';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';

export interface Event {
  id: string;
  title: string;
  level: string;
  platform: string;
  count: number;
  lastSeen: string;
  [key: string]: any;
}

export interface EventTableProps {
  filters?: any;
  onRowClick?: (event: Event) => void;
  refreshInterval?: number;
  optimized?: boolean;
  onEventUpdate?: (event: Event) => void;
  onExport?: (data: Event[]) => void;
  virtualized?: boolean;
  organizationId?: string;
  projectId?: string;
}

const EventTable = React.forwardRef<HTMLDivElement, EventTableProps>(({ 
  filters, 
  onRowClick,
  refreshInterval,
  organizationId,
  projectId
}, ref) => {
  // Get organization and project from global state if not provided
  const orgFromStore = useAppStore(state => state.organizationId || state.organizationSlug);
  const projectFromStore = useAppStore(state => state.projectId || state.projectSlug);
  
  // Use provided props or fall back to store values
  const effectiveOrgId = organizationId || orgFromStore || 'default';
  const effectiveProjectId = projectId || projectFromStore || 'default';
  
  // Use React Query to fetch events
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', effectiveOrgId, effectiveProjectId, filters],
    queryFn: () => api.events.getEvents({
      organization: effectiveOrgId,
      projectId: effectiveProjectId,
      query: filters?.query,
      limit: filters?.limit,
      sort: filters?.sort,
      sortDirection: filters?.sortDirection,
      environment: filters?.environment,
      timeRange: filters?.timeRange,
      level: filters?.level,
      page: filters?.page,
      perPage: filters?.perPage,
      options: {
        useIssues: filters?.useIssues
      }
    }),
    refetchInterval: refreshInterval,
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Extract events from response
  const events = eventsResponse?.items || [];
  
  // Container ref for keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null);
  const forwardedRef = ref || containerRef;
  
  // Setup keyboard navigation
  const {
    focusedIndex,
    handleKeyDown,
    getRowProps,
    getTableProps,
    focusItem,
    tableRef
  } = useTableKeyboardNavigation<Event>({
    items: events || [],
    containerRef: containerRef as React.RefObject<HTMLElement>,
    onActivate: (event) => onRowClick?.(event),
    rowSelector: 'tbody tr'
  });
  
  // Register component-specific shortcuts
  const tableShortcuts = [
    {
      key: 'j',
      action: () => {
        if (events?.length) {
          focusItem(Math.min(focusedIndex + 1, events.length - 1));
        }
      },
      description: 'Move to next event',
      scope: 'table',
      preventDefault: true
    },
    {
      key: 'k',
      action: () => {
        if (events?.length) {
          focusItem(Math.max(focusedIndex - 1, 0));
        }
      },
      description: 'Move to previous event',
      scope: 'table',
      preventDefault: true
    },
    {
      key: 'o',
      action: () => {
        if (events?.length && focusedIndex >= 0) {
          onRowClick?.(events[focusedIndex]);
        }
      },
      description: 'Open selected event',
      scope: 'table',
      preventDefault: true
    }
  ];
  
  // Initialize shortcuts
  const { setActiveScope, resetScope } = useGlobalShortcuts(tableShortcuts);
  
  // Set active scope when table receives focus
  useEffect(() => {
    const handleFocus = () => setActiveScope('table');
    const handleBlur = () => resetScope();
    
    const element = containerRef.current;
    if (element) {
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);
      
      return () => {
        element.removeEventListener('focus', handleFocus);
        element.removeEventListener('blur', handleBlur);
      };
    }
  }, [setActiveScope, resetScope]);

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
      <Box
        ref={forwardedRef as React.RefObject<HTMLDivElement>}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: 'none' }}
        {...getTableProps()}
      >
        <Table striped highlightOnHover>
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
            {events?.map((event, index) => (
              <tr 
                key={event.id} 
                onClick={() => onRowClick?.(event)} 
                {...getRowProps(index)}
                data-testid={`event-row-${index}`}
              >
                <td>{event.title}</td>
                <td>
                  <Badge color={event.level === 'error' ? 'red' : 'yellow'}>
                    {event.level}
                  </Badge>
                </td>
                <td>{event.platform || 'Unknown'}</td>
                <td>{event.count || 0}</td>
                <td>{event.lastSeen ? new Date(event.lastSeen).toLocaleString() : 'Unknown'}</td>
                <td>
                  <Group>
                    <ActionIcon 
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open in new tab or perform other action
                      }}
                    >
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Box>
    </ScrollArea>
  );
});

EventTable.displayName = 'EventTable';

export { EventTable };
export default EventTable;
