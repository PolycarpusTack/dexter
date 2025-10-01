import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, ScrollArea, Group, Badge, Text, ActionIcon, LoadingOverlay, Box, Container, Alert, Button } from '@mantine/core';
import { IconExternalLink, IconAlertCircle } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/unified';
import { useAuthStore } from '../../store';
import useTableKeyboardNavigation from '../../hooks/useTableKeyboardNavigation';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { ApiErrorDisplay } from '../UI';

import type { 
  Event, 
  BaseEvent,
  EventFilters, 
  EventsResponse 
} from '../../types/events';

export interface EventTableProps {
  filters?: EventFilters;
  onRowClick?: (event: Event) => void;
  refreshInterval?: number;
  optimized?: boolean;
  onEventUpdate?: (event: Event) => void;
  onExport?: (data: Event[]) => void;
  virtualized?: boolean;
  organizationId?: string;
  projectSlug?: string;
}

/**
 * EventTable component for displaying and managing Sentry events
 * 
 * @param filters - Filter criteria for events
 * @param onRowClick - Callback when a row is clicked
 * @param refreshInterval - Interval for auto-refresh in milliseconds
 * @param organizationId - Organization ID override
 * @param projectSlug - Project slug override
 * @param ref - Forwarded ref to the container element
 */
const EventTable = React.forwardRef<HTMLDivElement, EventTableProps>(({ 
  filters, 
  onRowClick,
  refreshInterval,
  organizationId,
  projectSlug
}, ref) => {
  // Get organization and project from global state if not provided
  const orgFromStore = useAuthStore(state => state.organizationId || state.organizationSlug);
  const projectFromStore = useAuthStore(state => state.projectSlug);
  
  // Use provided props or fall back to store values
  const effectiveOrgId = organizationId || orgFromStore || 'default';
  const effectiveProjectSlug = projectSlug || projectFromStore || 'default';
  
  // Check if configuration is missing
  const isConfigMissing = !effectiveOrgId || effectiveOrgId === 'default' || 
                         !effectiveProjectSlug || effectiveProjectSlug === 'default';
  
  // Memoize query parameters to prevent unnecessary refetches
  const queryParams = useMemo(() => ({
    organization: effectiveOrgId,
    projectSlug: effectiveProjectSlug,
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
  }), [effectiveOrgId, effectiveProjectSlug, filters]);

  // Use React Query to fetch events
  const { data: eventsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['events', queryParams],
    queryFn: () => api.events.fetchEvents(queryParams),
    enabled: !isConfigMissing, // Only fetch if configuration is valid
    refetchInterval: refreshInterval,
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Extract events from response
  const events = eventsResponse?.items || [];

  // Memoized EventRow component for performance
  const EventRow = React.memo(({ event, index, onRowClick, getRowProps }: {
    event: BaseEvent;
    index: number;
    onRowClick?: (event: BaseEvent) => void;
    getRowProps: (index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  }) => {
    const formattedDate = useMemo(() => 
      event.lastSeen ? new Date(event.lastSeen).toLocaleString() : 'Unknown', 
      [event.lastSeen]
    );

    const handleRowClick = useCallback(() => {
      onRowClick?.(event);
    }, [onRowClick, event]);

    return (
      <tr 
        key={event.id} 
        onClick={handleRowClick}
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
        <td>{formattedDate}</td>
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
    );
  });
  
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
        // Fix: Use the same element reference in cleanup
        if (element) {
          element.removeEventListener('focus', handleFocus);
          element.removeEventListener('blur', handleBlur);
        }
      };
    }
    // Return cleanup function even if element is null initially
    return () => {
      const currentElement = containerRef.current;
      if (currentElement) {
        currentElement.removeEventListener('focus', handleFocus);
        currentElement.removeEventListener('blur', handleBlur);
      }
    };
  }, [setActiveScope, resetScope]);

  // Check for missing configuration first
  if (isConfigMissing) {
    return (
      <Container p="md">
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          <Text size="sm" weight={500}>No organization or project configured</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Please configure your organization and project settings to view events.
          </Text>
          <Button 
            component={Link} 
            to="/config" 
            size="sm" 
            mt="sm"
            variant="light"
          >
            Configure Now
          </Button>
        </Alert>
      </Container>
    );
  }

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (error) {
    return (
      <ApiErrorDisplay 
        title="Could not load events"
        message="Failed to fetch events from the API. Please check your configuration and connectivity."
        error={error}
        onRetry={refetch}
      />
    );
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
              <EventRow
                key={event.id}
                event={event}
                index={index}
                onRowClick={onRowClick}
                getRowProps={getRowProps}
              />
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
