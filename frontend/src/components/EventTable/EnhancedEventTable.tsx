// frontend/src/components/EventTable/EnhancedEventTable.keyboard.tsx

import React, { useCallback, useMemo, useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react';
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
  useMantineTheme,
  Paper
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
  IconSortDescending,
  IconKeyboard
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { fetchIssuesList } from '../../api/issuesApi';
import ExportControl from '../Export/ExportControl';
import EmptyState from '../UI/EmptyState';
import LoadingSkeleton from '../UI/LoadingSkeleton';
import { SparklineCell, ImpactCell, DeadlockColumn } from './columns';
import { ErrorBoundary } from '../ErrorHandling';
import ErrorFallback from '../ErrorHandling/ErrorFallback';
import EventRow from './EventRow';
import { useAuditLog } from '../../hooks/useAuditLog';
import { EventTableProps, EventTableRef } from './types';
import { EventType, SortDirection, EventsResponse } from '../../types/eventTypes';
import useEventTableKeyboardNav from './useKeyboardNav';
import KeyboardShortcutsGuide from '../UI/KeyboardShortcutsGuide';
import './EventTable.css';

/**
 * Enhanced Event Table Component with keyboard navigation
 * 
 * Displays events with advanced filtering, sorting, and visualization features.
 * Includes keyboard navigation for accessibility and power users.
 */
const EnhancedEventTable = forwardRef<EventTableRef, EventTableProps>(({
  projectId,
  timeRange = '24h',
  onEventSelect,
  showFilters = true,
  maxItems = 50,
  autoRefresh = false,
}, ref) => {
  const theme = useMantineTheme();
  const logEvent = useAuditLog('EnhancedEventTable');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showKeyboardShortcuts, { open: openKeyboardShortcuts, close: closeKeyboardShortcuts }] = 
    useDisclosure(false);
  
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
  } = useQuery<EventsResponse, Error>({
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
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
    setPage(1); // Reset to first page when search changes
    logEvent('search', { query: event.currentTarget.value });
  };
  
  // Handle level filter change
  const handleLevelFilterChange = (value: string | null): void => {
    setLevelFilter(value || '');
    setPage(1); // Reset to first page when filter changes
    logEvent('filter_level', { level: value });
  };
  
  // Handle sort change
  const handleSortChange = (key: string): void => {
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
  const handleEventClick = useCallback((event: EventType): void => {
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
  const handleEventAction = useCallback((action: string, event: EventType): void => {
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
  const totalPages = useMemo((): number => {
    if (!data?.count) return 1;
    return Math.ceil(data.count / maxItems);
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
  const renderSortIcon = (key: string): React.ReactNode => {
    if (sortBy !== key) {
      return <IconArrowsSort size={14} />;
    }
    return sortDirection === 'asc' 
      ? <IconSortAscending size={14} /> 
      : <IconSortDescending size={14} />;
  };
  
  // Set up keyboard navigation
  const { selectedIndex, setSelectedIndex, selectedEvent } = useEventTableKeyboardNav(
    data?.items,
    tableContainerRef,
    handleEventClick
  );
  
  // Keyboard shortcut for refresh
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Ctrl+R or Cmd+R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault(); // Prevent browser refresh
        refetch();
      }
      
      // ? key to show keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        openKeyboardShortcuts();
      }
    };
    
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [refetch, openKeyboardShortcuts]);
  
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
              <Tooltip label="Keyboard Shortcuts (?)">
                <ActionIcon
                  color="blue"
                  variant="light"
                  onClick={openKeyboardShortcuts}
                >
                  <IconKeyboard size={16} />
                </ActionIcon>
              </Tooltip>
            
              <Tooltip label="Refresh (Ctrl+R)">
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
        
        {/* Keyboard navigation hint */}
        <Paper p="xs" withBorder bg="blue.0" style={{ border: `1px solid ${theme.colors.blue[3]}` }}>
          <Group spacing="xs">
            <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
              <IconKeyboard size={12} />
            </ThemeIcon>
            <Text size="xs">
              <Text span fw={500}>Keyboard Navigation:</Text> Use arrow keys to navigate, Enter to select. Press ? for more shortcuts.
            </Text>
          </Group>
        </Paper>
        
        {/* Error display */}
        {error && (
          <Text color="red" size="sm">
            <IconAlertCircle size={14} style={{ marginRight: '8px' }} />
            Error loading events: {error.message}
          </Text>
        )}
        
        {/* Table */}
        <Box ref={tableContainerRef} tabIndex={0} className="keyboard-navigable-table">
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
                  data?.items?.map((event, index) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                      onAction={handleEventAction}
                      isSelected={index === selectedIndex}
                      aria-selected={index === selectedIndex}
                      onMouseEnter={() => setSelectedIndex(index)}
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
              onChange={(newPage: number) => {
                setPage(newPage);
                setSelectedIndex(-1); // Reset selection when page changes
                logEvent('pagination', { page: newPage });
              }}
              size="sm"
            />
          </Group>
        )}
        
        {/* Keyboard shortcuts modal */}
        <KeyboardShortcutsGuide 
          opened={showKeyboardShortcuts}
          onClose={closeKeyboardShortcuts}
          isMac={navigator.platform.toLowerCase().includes('mac')}
        />
      </Stack>
    </ErrorBoundary>
  );
});

EnhancedEventTable.displayName = "EnhancedEventTable";

export default EnhancedEventTable;