// File: frontend/src/components/EventTable/EventTable.jsx

import React, { useCallback, useMemo, useEffect } from 'react';
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
  useMantineTheme
} from '@mantine/core';
import { 
  IconSearch, 
  IconAlertCircle, 
  IconFilter,
  IconRefresh
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { fetchIssuesList } from '../../api/issuesApi.ts';
import ExportControl from '../Export/ExportControl';
import EmptyState from '../UI/EmptyState';
import LoadingSkeleton from '../UI/LoadingSkeleton';

// Constants for reusable configurations
const STATUS_OPTIONS = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'all', label: 'All' },
];

const LEVEL_COLORS = {
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  debug: 'gray',
};

function EventTable() {
  const theme = useMantineTheme();
  const { 
    organizationSlug, 
    projectSlug, 
    selectedIssueId, 
    statusFilter, 
    searchQuery,
    setSelectedIssue,
    setStatusFilter,
    setSearchQuery,
    storeLatestEventId
  } = useAppStore();

  // Pagination state
  const [activePage, setActivePage] = React.useState(1);
  const [cursor, setCursor] = React.useState(null);
  const [cursorHistory, setCursorHistory] = React.useState([]);

  // Add debugging for store data
  useEffect(() => {
    console.log("AppStore state:", { 
      organizationSlug, 
      projectSlug, 
      selectedIssueId, 
      statusFilter, 
      searchQuery 
    });
  }, [organizationSlug, projectSlug, selectedIssueId, statusFilter, searchQuery]);

  // Query configuration
  const queryKey = ['issuesList', { organizationSlug, projectSlug, statusFilter, searchQuery, cursor }];
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchIssuesList({ organizationSlug, projectSlug, statusFilter, searchQuery, cursor }),
    enabled: !!organizationSlug && !!projectSlug,
    staleTime: 60_000, // 1 minute cache
    refetchOnWindowFocus: false,
    onSuccess: (responseData) => {
      // Process the response to store event IDs
      console.log("Query success, processing data:", responseData);
      try {
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          responseData.data.forEach(issue => {
            // Try to find an event ID from various possible properties
            const eventId = 
              issue.latestEvent?.id || 
              issue.lastEventId || 
              issue.events?.[0]?.id ||
              issue.firstEventId;
            
            // Store it if found
            if (eventId && issue.id) {
              console.log(`Storing event ID ${eventId} for issue ${issue.id}`);
              storeLatestEventId(issue.id, eventId);
            }
          });
        }
      } catch (error) {
        console.error("Error processing issue data in onSuccess:", error);
      }
    }
  });

  // Derived data
  const issues = useMemo(() => {
    console.log("Raw data received:", data);
    // Handle different possible response formats
    if (!data) return [];
    
    // If data is an array directly
    if (Array.isArray(data)) {
      console.log("Data is a direct array, length:", data.length);
      return data;
    }
    
    // If data has a data property that's an array (common API pattern)
    if (data.data && Array.isArray(data.data)) {
      console.log("Data has data property as array, length:", data.data.length);
      return data.data;
    }
    
    // If data has an issues property that's an array
    if (data.issues && Array.isArray(data.issues)) {
      console.log("Data has issues property as array, length:", data.issues.length);
      return data.issues;
    }
    
    console.warn("Unexpected data format:", data);
    return [];
  }, [data]);
  
  const pagination = useMemo(() => {
    if (!data) return {};
    return data.pagination || {};
  }, [data]);
  
  const hasNextPage = !!pagination?.next?.cursor;
  const hasPrevPage = !!pagination?.previous?.cursor || !!pagination?.prev?.cursor;

  // Event handlers
  const handlePageChange = useCallback((newPage) => {
    if (newPage > activePage && hasNextPage) {
      setCursorHistory(prev => [...prev, cursor]);
      setCursor(pagination.next.cursor);
    } else if (newPage < activePage && hasPrevPage) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory(prev => prev.slice(0, -1));
      setCursor(prevCursor);
    }
    setActivePage(newPage);
  }, [activePage, cursor, cursorHistory, hasNextPage, hasPrevPage, pagination]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const handleIssueSelection = useCallback((issue) => {
    if (!issue?.id) return;
    
    const eventId = issue.latestEvent?.id || 
                   issue.events?.[0]?.id || 
                   issue.lastEventId || 
                   issue.firstEventId;
    
    console.log(`Selecting issue: ${issue.id}, event ID: ${eventId}`);
    setSelectedIssue(issue.id === selectedIssueId ? null : issue.id, eventId);
  }, [selectedIssueId, setSelectedIssue]);

  // Memoized table rows
  const tableRows = useMemo(() => issues.map((issue) => {
    console.log("Rendering issue row:", issue.id);
    return (
      <Table.Tr 
        key={issue.id}
        onClick={() => handleIssueSelection(issue)}
        data-selected={issue.id === selectedIssueId}
        style={{
          cursor: 'pointer',
          backgroundColor: issue.id === selectedIssueId ? theme.colors.blue[0] : undefined
        }}
        sx={(theme) => ({
          '&:hover': { backgroundColor: theme.colors.gray[0] }
        })}
      >
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon color={LEVEL_COLORS[issue.level] || 'gray'} size="sm" variant="light">
              <IconAlertCircle size={12} />
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Text fw={500} truncate>{issue.title || issue.culprit || 'Unnamed Issue'}</Text>
              <Text size="xs" c="dimmed" truncate>{issue.shortId || issue.id}</Text>
            </div>
            <Badge color={issue.status === 'resolved' ? 'green' : 'gray'} variant="light">
              {issue.status || issue.level}
            </Badge>
          </Group>
        </Table.Td>
        <Table.Td><Badge variant="outline">{issue.count || '0'}</Badge></Table.Td>
        <Table.Td><Badge variant="outline">{issue.userCount || '0'}</Badge></Table.Td>
        <Table.Td>
          {issue.lastSeen ? formatDistanceToNow(new Date(issue.lastSeen), { addSuffix: true }) : 'Unknown'}
        </Table.Td>
      </Table.Tr>
    );
  }), [issues, selectedIssueId, handleIssueSelection, theme]);

  // Loading and error states
  if (!organizationSlug || !projectSlug) {
    return (
      <EmptyState
        icon={<IconAlertCircle size={48} />}
        title="Configuration Required"
        message="Please configure your Sentry organization and project to view issues."
      />
    );
  }

  if (isLoading) return <LoadingSkeleton type="table" rows={5} />;

  if (error) {
    console.error("Error loading issues:", error);
    return (
      <EmptyState
        icon={<IconAlertCircle size={48} />}
        title="Error Loading Issues"
        message={error.message || "An unexpected error occurred while loading issues"}
        buttonLabel="Try Again"
        buttonAction={refetch}
      />
    );
  }

  if (issues.length === 0) {
    return (
      <Stack>
        <FilterControls 
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />
        <EmptyState
          icon={<IconSearch size={48} />}
          title="No Issues Found"
          message={searchQuery || statusFilter !== 'unresolved' 
            ? "No matching issues found. Adjust your filters."
            : "No unresolved issues in this project."}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <FilterControls
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Issue</Table.Th>
              <Table.Th>Events</Table.Th>
              <Table.Th>Users</Table.Th>
              <Table.Th>Last Seen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{tableRows}</Table.Tbody>
        </Table>
      </ScrollArea>

      {(hasNextPage || hasPrevPage) && (
        <Pagination
          value={activePage}
          onChange={handlePageChange}
          total={activePage + 2} // Approximate page count
          disabled={isFetching}
          withEdges
          size="sm"
          mt="md"
        />
      )}
    </Stack>
  );
}

// Sub-component for filter controls
const FilterControls = React.memo(({ 
  searchQuery, 
  statusFilter, 
  onSearchChange, 
  onStatusChange, 
  onRefresh, 
  isRefreshing 
}) => (
  <Flex gap="sm" wrap="wrap">
    <TextInput
      placeholder="Search issues..."
      leftSection={<IconSearch size={16} />}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ flex: '1', minWidth: '300px' }}
    />
    <Group gap="xs">
      <Select
        leftSection={<IconFilter size={16} />}
        value={statusFilter}
        onChange={onStatusChange}
        data={STATUS_OPTIONS}
        allowDeselect={false}
        style={{ width: '140px' }}
      />
      <ExportControl />
      <Tooltip label="Refresh issues">
        <ActionIcon 
          variant="subtle" 
          onClick={onRefresh}
          loading={isRefreshing}
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  </Flex>
));

export default EventTable;