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
  Paper,
  Checkbox
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
  IconKeyboard,
  IconShare,
  IconEye
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { fetchIssues } from '../../api/issuesApi';
import ExportControl from '../Export/ExportControl';
import EmptyState from '../UI/EmptyState';
import LoadingSkeleton from '../UI/LoadingSkeleton';
import BulkActionBar from './bulk-actions/BulkActionBar';
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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  
  // Get organization and project from global state
  const organizationIdFromStore = useAppStore(state => state.organizationId || state.organizationSlug);
  const projectIdFromStore = useAppStore(state => state.projectId || state.projectSlug);
  
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
    queryFn: async () => {
      const issuesResponse = await fetchIssues({
        organization: effectiveOrgId || 'default',
        projectId: effectiveProjectId || 'default',
        timeRange,
        query: search,
        level: levelFilter,
        sort: sortBy,
        sortDirection,
        page,
        perPage: maxItems
      });
      
      // Transform Issue[] to EventType[]
      const events: EventType[] = issuesResponse.items.map(issue => ({
        ...issue, // Spread first
        id: issue.id,
        title: issue.title,
        message: issue.title || 'Unknown error', // Use title as message
        level: issue.level || 'error', // Default to error if not present
        timestamp: issue.lastSeen || issue.firstSeen || new Date().toISOString(),
        count: issue.count || 1,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        tags: issue.tags || [],
        status: issue.status as 'unresolved' | 'resolved' | 'ignored' | undefined,
        project: issue.project?.id || issue.project?.name
      }));
      
      return {
        items: events,
        count: issuesResponse.count,
        hasMore: !!issuesResponse.links?.next
      };
    },
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
  
  // Handle select all toggle
  const handleSelectAllToggle = (): void => {
    if (isAllSelected || selectedItems.length > 0) {
      setSelectedItems([]);
      setIsAllSelected(false);
    } else {
      const allItems = data?.items?.map(item => item.id) || [];
      setSelectedItems(allItems);
      setIsAllSelected(true);
    }
  };
  
  // Handle individual item selection toggle
  const handleItemSelectToggle = (eventId: string): void => {
    setSelectedItems(prev => {
      if (prev.includes(eventId)) {
        const newSelection = prev.filter(id => id !== eventId);
        setIsAllSelected(false);
        return newSelection;
      } else {
        const newSelection = [...prev, eventId];
        setIsAllSelected(newSelection.length === data?.items?.length);
        return newSelection;
      }
    });
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
  
  // Show current selected event in development
  useEffect(() => {
    if (selectedEvent) {
      console.debug('Currently selected event:', selectedEvent.id);
    }
  }, [selectedEvent]);
  
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
      fallback={(error, resetError) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onError={() => {
        refetch();
      }}
    >
      <Stack gap="md">
        {/* Filters and controls */}
        {showFilters && (
          <Group justify="apart">
            <Group gap="sm">
              <TextInput
                placeholder="Search events..."
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={handleSearchChange}
                style={{ width: 250 }}
              />
              
              <Select
                placeholder="Filter by level"
                data={levelOptions}
                value={levelFilter}
                onChange={handleLevelFilterChange}
                leftSection={<IconFilter size={14} />}
                style={{ width: 150 }}
                clearable
              />
            </Group>
            
            <Group gap="sm">
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
          <Group gap="xs">
            <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
              <IconKeyboard size={12} />
            </ThemeIcon>
            <Text size="xs">
              <Text span fw={500}>Keyboard Navigation:</Text> Use arrow keys to navigate, Enter to select. Press ? for more shortcuts.
            </Text>
            {selectedEvent && (
              <Badge size="xs" color="blue">
                Selected: {selectedEvent.id}
              </Badge>
            )}
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
                  <th style={{ width: 40 }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={!isAllSelected && selectedItems.length > 0}
                      onChange={handleSelectAllToggle}
                    />
                  </th>
                  <th style={{ minWidth: 300 }}>
                    <Group gap="xs" style={{ whiteSpace: 'nowrap' }}>
                      <Flex direction="row" align="center" onClick={() => handleSortChange('title')} style={{ cursor: 'pointer' }}>
                        <Text size="sm">Message</Text>
                        {sortBy === 'title' && <IconChevronDown size={14} style={{ transform: sortDirection === 'asc' ? 'rotate(180deg)' : 'none' }} />}
                      </Flex>
                    </Group>
                  </th>
                  <th style={{ minWidth: 100 }}>Frequency</th>
                  <th style={{ minWidth: 100 }}>Impact</th>
                  <th style={{ minWidth: 120 }}>
                    <Group gap="xs" style={{ whiteSpace: 'nowrap' }} onClick={() => handleSortChange('timestamp')}>
                      <Text size="sm">When</Text>
                      {renderSortIcon('timestamp')}
                    </Group>
                  </th>
                  <th style={{ width: 100 }}>Deadlock</th>
                  <th style={{ width: 60 }}>
                    <Menu width={200} shadow="md">
                      <Menu.Target>
                        <ActionIcon variant="subtle" size="sm">
                          <IconDots size={16} color={theme.colors.gray[5]} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Bulk Actions</Menu.Label>
                        <Menu.Item
                          leftSection={<IconCheckbox size={14} />}
                          disabled={selectedItems.length === 0}
                          onClick={() => handleSelectAllToggle()}
                        >
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconEye size={14} />}
                          disabled={selectedItems.length === 0}
                          onClick={() => console.log('View selected')}
                        >
                          View Selected
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconBookmark size={14} />}
                          disabled={selectedItems.length === 0}
                          onClick={() => console.log('Bookmark selected')}
                        >
                          Bookmark
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconShare size={14} />}
                          disabled={selectedItems.length === 0}
                          onClick={() => console.log('Share selected')}
                        >
                          Share
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          disabled={selectedItems.length === 0}
                          onClick={() => console.log('Delete selected')}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <LoadingSkeleton rows={5} height={50} />
                    </td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState 
                        title="No events found"
                        message="Try adjusting your search or filter criteria"
                        icon={<IconAlertCircle size={40} />}
                      />
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((event: EventType, index: number) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                      onAction={handleEventAction}
                      isSelected={index === selectedIndex}
                      aria-selected={index === selectedIndex}
                      onMouseEnter={() => setSelectedIndex(index)}
                      isRowSelected={selectedItems.includes(event.id)}
                      onSelectToggle={handleItemSelectToggle}
                    />
                  ))
                )}
              </tbody>
            </Table>
          </ScrollArea>
        </Box>
        
        {/* Bulk action bar */}
        <BulkActionBar
          selectedEvents={data?.items?.filter(event => selectedItems.includes(event.id)) || []}
          onClearSelection={() => {
            setSelectedItems([]);
            setIsAllSelected(false);
          }}
          visible={selectedItems.length > 0}
        />
        
        {/* Pagination */}
        {data && totalPages > 1 && (
          <Group justify="right">
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