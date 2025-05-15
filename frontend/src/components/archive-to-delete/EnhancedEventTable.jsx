// frontend/src/components/EventTable/EnhancedEventTable.jsx

import React, { useCallback, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Table, 
  ScrollArea, 
  Text, 
  Group, 
  TextInput, 
  Select, 
  Pagination, 
  Stack, 
  Badge, 
  Flex,
  ActionIcon,
  ThemeIcon,
  Tooltip,
  Menu,
  Box,
  useMantineTheme
} from '@mantine/core';
import { 
  IconSearch, 
  IconAlertCircle, 
  IconFilter,
  IconRefresh,
  IconDots,
  IconChevronDown,
  IconTrash,
  IconBookmark,
  IconCheckbox,
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { fetchIssuesList } from '../../api/issuesApi.ts';
import ExportControl from '../Export/ExportControl';
import EmptyState from '../UI/EmptyState';
import LoadingSkeleton from '../UI/LoadingSkeleton';
import { SparklineCell, ImpactCell, DeadlockColumn } from './columns';
import { ErrorBoundary } from '../ErrorHandling';
import ErrorFallback from '../ErrorHandling/ErrorFallback';
import EventRow from './EventRow';
import { useAuditLog } from '../../hooks/useAuditLog';
import './EventTable.css';

/**
 * Enhanced Event Table Component
 * 
 * Displays events with advanced filtering, sorting, and visualization features.
 * Includes the DeadlockModal for PostgreSQL deadlock events.
 */
const EnhancedEventTable = forwardRef(({
  projectId,
  timeRange = '24h',
  onEventSelect,
  showFilters = true,
  maxItems = 50,
  autoRefresh = false,
}, ref) => {
  const theme = useMantineTheme();
  const logEvent = useAuditLog('EnhancedEventTable');
  
  // State
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [levelFilter, setLevelFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('timestamp');
  const [sortDirection, setSortDirection] = React.useState('desc');
  
  // Get organization and project from global state
  const organizationIdFromStore = useAppStore(state => state.organization?.id || state.organizationSlug);
  const projectIdFromStore = useAppStore(state => state.project?.id || state.projectSlug);
  
  // Use provided projectId prop or fall back to store value
  const effectiveProjectId = projectId || projectIdFromStore;
  const effectiveOrgId = organizationIdFromStore;
  
  // Add debug message to help users understand the issue
  useEffect(() => {
    if (!effectiveOrgId || !effectiveProjectId) {
      console.log("Organization or Project not set. Using mock data for development.");
    }
  }, [effectiveOrgId, effectiveProjectId]);
  
  // Fetch events/issues data
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['issues', effectiveProjectId, page, search, levelFilter, sortBy, sortDirection, timeRange],
    queryFn: () => fetchIssuesList({
      organizationId: effectiveOrgId || 'default',
      projectId: effectiveProjectId || 'default',
      timeRange,
      query: search,
      level: levelFilter,
      sort: sortBy,
      sortDirection,
      page,
      perPage: maxItems
    }),
    // Allow the query to run even if we don't have real org/project IDs
    // This will use mock data in development mode
    enabled: true,
    refetchInterval: autoRefresh ? 30000 : false, // Auto refresh every 30 seconds if enabled
  });
  
  // Expose refetch method via ref
  useImperativeHandle(ref, () => ({
    refresh: refetch
  }));
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearch(event.currentTarget.value);
    setPage(1); // Reset to first page when search changes
    logEvent('search', { query: event.currentTarget.value });
  };
  
  // Handle level filter change
  const handleLevelFilterChange = (value) => {
    setLevelFilter(value);
    setPage(1); // Reset to first page when filter changes
    logEvent('filter_level', { level: value });
  };
  
  // Handle sort change
  const handleSortChange = (key) => {
    if (sortBy === key) {
      // Toggle direction if already sorting by this key
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort key and default to descending
      setSortBy(key);
      setSortDirection('desc');
    }
    logEvent('sort', { field: key, direction: sortDirection === 'asc' ? 'desc' : 'asc' });
  };
  
  // Handle event row click
  const handleEventClick = useCallback((event) => {
    console.log("Event clicked in table:", event.id);
    // Update the application store
    useAppStore.getState().setSelectedIssue(event.id);
    // Also call the prop callback if provided
    if (onEventSelect) {
      onEventSelect(event);
    }
    logEvent('select_event', { eventId: event.id });
  }, [onEventSelect, logEvent]);
  
  // Handle event actions
  const handleEventAction = useCallback((action, event) => {
    // Handle different actions (view, bookmark, share, delete)
    console.log(`Action ${action} on event ${event.id}`);
    logEvent('event_action', { action, eventId: event.id });
    
    // Example implementation - can be expanded based on requirements
    switch (action) {
      case 'view':
        if (onEventSelect) {
          onEventSelect(event);
        }
        break;
      case 'bookmark':
        // Add bookmark functionality
        break;
      case 'share':
        // Add share functionality
        break;
      case 'delete':
        // Add delete functionality
        break;
      default:
        break;
    }
  }, [onEventSelect, logEvent]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.ceil(data.totalCount / maxItems);
  }, [data, maxItems]);
  
  // Level filter options
  const levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'fatal', label: 'Fatal' },
    { value: 'error', label: 'Error' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' }
  ];
  
  // Render sort icon for column headers
  const renderSortIcon = (key) => {
    if (sortBy !== key) {
      return <IconArrowsSort size={14} />;
    }
    return sortDirection === 'asc' 
      ? <IconSortAscending size={14} /> 
      : <IconSortDescending size={14} />;
  };
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={refetch}
    >
      <Stack spacing="md">
        {/* Filters and controls */}
        {showFilters && (
          <Group position="apart">
            <Group spacing="sm">
              <TextInput
                placeholder="Search events..."
                icon={<IconSearch size={14} />}
                value={search}
                onChange={handleSearchChange}
                style={{ width: 250 }}
              />
              
              <Select
                placeholder="Filter by level"
                data={levelOptions}
                value={levelFilter}
                onChange={handleLevelFilterChange}
                icon={<IconFilter size={14} />}
                style={{ width: 150 }}
                clearable
              />
            </Group>
            
            <Group spacing="sm">
              <Tooltip label="Refresh">
                <ActionIcon 
                  color="blue" 
                  variant="light"
                  onClick={() => {
                    refetch();
                    logEvent('refresh');
                  }}
                  loading={isLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
              
              <ExportControl 
                data={data?.items || []} 
                filename="events-export" 
              />
            </Group>
          </Group>
        )}
        
        {/* Error display */}
        {error && (
          <Text color="red" size="sm">
            <IconAlertCircle size={14} style={{ marginRight: '8px' }} />
            Error loading events: {error.message}
          </Text>
        )}
        
        {/* Table */}
        <Box>
          <ScrollArea>
            <Table style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ minWidth: 300 }}>
                    <Group spacing="xs" style={{ whiteSpace: 'nowrap' }} onClick={() => handleSortChange('title')}>
                      <Text size="sm">Message</Text>
                      {renderSortIcon('title')}
                    </Group>
                  </th>
                  <th style={{ minWidth: 150 }}>Tags</th>
                  <th style={{ width: 120 }}>
                    <Group spacing="xs" style={{ whiteSpace: 'nowrap' }} onClick={() => handleSortChange('timestamp')}>
                      <Text size="sm">When</Text>
                      {renderSortIcon('timestamp')}
                    </Group>
                  </th>
                  <th style={{ width: 140 }}>Analysis</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadingSkeleton rows={5} height={50} />
                    </td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState 
                        title="No events found"
                        message="Try adjusting your search or filter criteria"
                        icon={<IconAlertCircle size={40} />}
                      />
                    </td>
                  </tr>
                ) : (
                  data?.items?.map(event => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                      onAction={handleEventAction}
                    />
                  ))
                )}
              </tbody>
            </Table>
          </ScrollArea>
        </Box>
        
        {/* Pagination */}
        {data && totalPages > 1 && (
          <Group position="right">
            <Pagination
              total={totalPages}
              value={page}
              onChange={(newPage) => {
                setPage(newPage);
                logEvent('pagination', { page: newPage });
              }}
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </ErrorBoundary>
  );
});

EnhancedEventTable.displayName = "EnhancedEventTable";

export default EnhancedEventTable;
