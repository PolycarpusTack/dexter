import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Text,
  Group,
  Button,
  Select,
  TextInput,
  Stack,
  Paper,
  Badge,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  ScrollArea,
  Pagination,
  Menu,
  Checkbox,
} from '@mantine/core';
import {
  IconDownload,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconSearch,
  IconColumns,
  IconChartBar,
  IconRefresh,
  IconDots,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { discoverApi, DiscoverQueryResponse } from '../../utils/api';

// Types
interface ResultTableProps {
  query: any;
  onExecute: (updatedQuery?: any) => void;
  onVisualize: (data: any) => void;
}

// Utility functions
const formatValue = (value: any, field: string, units?: Record<string, string>) => {
  if (value === null || value === undefined) return '-';
  
  const unit = units?.[field];
  
  if (unit === 'duration' && typeof value === 'number') {
    // Convert to milliseconds and format
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${value.toFixed(0)}ms`;
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(value).toLocaleString();
  }
  
  return String(value);
};

const ResultTable: React.FC<ResultTableProps> = ({ query, onExecute, onVisualize }) => {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [queryLimit, setQueryLimit] = useState(query.limit || 50);

  // Fetch results
  const {
    data: results,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<DiscoverQueryResponse>({
    queryKey: ['discover-results', query, page],
    queryFn: async (): Promise<DiscoverQueryResponse> => {
      return discoverApi.query({
        ...query,
        cursor: page > 1 ? results?._pagination?.next : undefined,
      });
    },
    enabled: !!query,
  });

  // Initialize visible columns
  React.useEffect(() => {
    if (results?.meta?.fields) {
      setVisibleColumns(Object.keys(results.meta.fields));
    }
  }, [results?.meta?.fields]);

  // Filter and sort data
  const processedData = useMemo<any[]>(() => {
    if (!results?.data) return [];

    let filtered = results.data;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [results, searchQuery, sortField, sortDirection]);

  // Export data
  const exportData = (format: 'csv' | 'json') => {
    if (!results?.data) return;

    const data = selectedRows.length > 0
      ? results.data.filter((_: any, index: number) => selectedRows.includes(String(index)))
      : results.data;

    if (format === 'csv') {
      const headers = Object.keys(results.meta.fields);
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map((field) => JSON.stringify(row[field] ?? '')).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discover-export-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discover-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (error) {
    return (
      <Paper p="md" withBorder>
        <Text c="red">Error executing query: {(error as any).message}</Text>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack gap="md">
        {/* Toolbar */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <Group>
              <TextInput
                placeholder="Search results..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 300 }}
              />
              <Select
                placeholder="Limit"
                value={String(queryLimit)}
                onChange={(value: string | null) => {
                  if (value) {
                    setQueryLimit(Number(value));
                    // Update the query and re-execute
                    const updatedQuery = { ...query, limit: Number(value) };
                    // Pass the updated query to the parent component
                    onExecute(updatedQuery);
                  }
                }}
                data={[
                  { value: '10', label: '10 rows' },
                  { value: '50', label: '50 rows' },
                  { value: '100', label: '100 rows' },
                  { value: '500', label: '500 rows' },
                ]}
                style={{ width: 120 }}
              />
              <Tooltip label="Apply filters">
                <ActionIcon variant="default" size="lg">
                  <IconFilter size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="default"
                onClick={() => refetch()}
                loading={isFetching}
              >
                Refresh
              </Button>
              <Button
                leftSection={<IconChartBar size={16} />}
                variant="default"
                onClick={() => results && onVisualize(results)}
                disabled={!results?.data?.length}
              >
                Visualize
              </Button>
              <Menu position="bottom-end">
                <Menu.Target>
                  <Button leftSection={<IconDownload size={16} />} variant="default">
                    Export
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => exportData('csv')}>Export as CSV</Menu.Item>
                  <Menu.Item onClick={() => exportData('json')}>Export as JSON</Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Menu position="bottom-end">
                <Menu.Target>
                  <Button 
                    leftSection={<IconColumns size={16} />} 
                    variant="default"
                    rightSection={
                      <Badge size="xs" variant="filled">
                        {visibleColumns.length}
                      </Badge>
                    }
                  >
                    Columns
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Show/Hide Columns</Menu.Label>
                  {results?.meta?.fields &&
                    Object.keys(results.meta.fields).map((field) => (
                      <Menu.Item key={field} closeMenuOnClick={false}>
                        <Checkbox
                          checked={visibleColumns.includes(field)}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setVisibleColumns([...visibleColumns, field]);
                            } else {
                              setVisibleColumns(
                                visibleColumns.filter((col) => col !== field)
                              );
                            }
                          }}
                          label={field}
                        />
                      </Menu.Item>
                    ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Paper>

        {/* Results Table */}
        <Paper withBorder style={{ position: 'relative' }}>
          <LoadingOverlay visible={isLoading} />
          
          {results?.data?.length === 0 ? (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="dimmed">No results found</Text>
              <ActionIcon 
                variant="transparent" 
                color="blue" 
                mx="auto" 
                mt="md"
                onClick={() => refetch()}
              >
                <IconDots size={24} />
              </ActionIcon>
            </Box>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <Checkbox
                        checked={
                          selectedRows.length === processedData.length &&
                          processedData.length > 0
                        }
                        indeterminate={
                          selectedRows.length > 0 &&
                          selectedRows.length < processedData.length
                        }
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setSelectedRows(
                              processedData.map((_: any, index: number) => String(index))
                            );
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </th>
                    {results?.meta?.fields &&
                      Object.entries(results.meta.fields)
                      .filter(([field]) => visibleColumns.includes(field))
                      .map(([field, _type]) => (
                          <th key={field}>
                            <Group
                              gap="xs"
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleSort(field)}
                            >
                              <Text size="sm" fw={600}>
                                {field}
                              </Text>
                              {sortField === field && (
                                <Tooltip label={`Sorted ${sortDirection}ending`}>
                                  <ActionIcon size="xs" variant="subtle">
                                    {sortDirection === 'asc' ? (
                                      <IconSortAscending size={12} />
                                    ) : (
                                      <IconSortDescending size={12} />
                                    )}
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {_type === 'string' && (
                                <Badge size="xs" variant="light" color="blue">
                                  text
                                </Badge>
                              )}
                              {_type === 'number' && (
                                <Badge size="xs" variant="light" color="green">
                                  num
                                </Badge>
                              )}
                            </Group>
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((row: any, index: number) => (
                    <tr key={index}>
                      <td>
                        <Checkbox
                          checked={selectedRows.includes(String(index))}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setSelectedRows([...selectedRows, String(index)]);
                            } else {
                              setSelectedRows(
                                selectedRows.filter((id) => id !== String(index))
                              );
                            }
                          }}
                        />
                      </td>
                      {results?.meta?.fields &&
                        Object.entries(results.meta.fields)
                          .filter(([field]) => visibleColumns.includes(field))
                          .map(([field]) => (
                            <td key={field}>
                              <Text size="sm">
                                {formatValue(row[field], field, results.meta.units)}
                              </Text>
                            </td>
                          ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>

        {/* Pagination */}
        {results?.data?.length && results._pagination && (results._pagination.next || results._pagination.previous) && (
          <Group justify="center">
            <Pagination
              value={page}
              onChange={setPage}
              total={10} // TODO: Calculate based on total results
            />
          </Group>
        )}

        {/* Query Info */}
        {results && (
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {results.executedAt ? `Query executed at: ${new Date(results.executedAt).toLocaleString()}` : 'Query executed'}
              </Text>
              <Text size="sm" c="dimmed">
                {results.data.length} results
              </Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default ResultTable;
