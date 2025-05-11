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
import api from '../../utils/api';

// Types
interface ResultData {
  data: any[];
  meta: {
    fields: Record<string, string>;
    units: Record<string, string>;
  };
  query: any;
  executedAt: string;
  _pagination?: {
    next?: { cursor: string; url: string };
    previous?: { cursor: string; url: string };
  };
}

interface ResultTableProps {
  query: any;
  onExecute: () => void;
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

  // Fetch results
  const {
    data: results,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ResultData>(
    ['discover-results', query, page],
    async () => {
      const response = await api.post('/api/discover/query', {
        ...query,
        cursor: page > 1 ? results?._pagination?.next?.cursor : undefined,
      });
      return response.data;
    },
    {
      enabled: !!query,
      keepPreviousData: true,
    }
  );

  // Initialize visible columns
  React.useEffect(() => {
    if (results?.meta?.fields) {
      setVisibleColumns(Object.keys(results.meta.fields));
    }
  }, [results?.meta?.fields]);

  // Filter and sort data
  const processedData = useMemo(() => {
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
      ? results.data.filter((_, index) => selectedRows.includes(String(index)))
      : results.data;

    if (format === 'csv') {
      const headers = Object.keys(results.meta.fields);
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
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
        <Text color="red">Error executing query: {(error as any).message}</Text>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack spacing="md">
        {/* Toolbar */}
        <Paper p="md" withBorder>
          <Group position="apart">
            <Group>
              <TextInput
                placeholder="Search results..."
                icon={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 300 }}
              />
              <Select
                placeholder="Limit"
                value={String(query.limit || 50)}
                onChange={(value) => {
                  // Update query limit
                }}
                data={[
                  { value: '10', label: '10 rows' },
                  { value: '50', label: '50 rows' },
                  { value: '100', label: '100 rows' },
                  { value: '500', label: '500 rows' },
                ]}
                style={{ width: 120 }}
              />
            </Group>
            <Group>
              <Button
                leftIcon={<IconRefresh size={16} />}
                variant="default"
                onClick={() => refetch()}
                loading={isFetching}
              >
                Refresh
              </Button>
              <Button
                leftIcon={<IconChartBar size={16} />}
                variant="default"
                onClick={() => onVisualize(results)}
                disabled={!results?.data?.length}
              >
                Visualize
              </Button>
              <Menu position="bottom-end">
                <Menu.Target>
                  <Button leftIcon={<IconDownload size={16} />} variant="default">
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
                  <ActionIcon variant="default">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Columns</Menu.Label>
                  {results?.meta?.fields &&
                    Object.keys(results.meta.fields).map((field) => (
                      <Menu.Item key={field}>
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
              <Text color="dimmed">No results found</Text>
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
                              processedData.map((_, index) => String(index))
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
                        .map(([field, type]) => (
                          <th key={field}>
                            <Group
                              spacing="xs"
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleSort(field)}
                            >
                              <Text size="sm" weight={600}>
                                {field}
                              </Text>
                              {sortField === field && (
                                <ActionIcon size="xs" variant="subtle">
                                  {sortDirection === 'asc' ? (
                                    <IconSortAscending size={12} />
                                  ) : (
                                    <IconSortDescending size={12} />
                                  )}
                                </ActionIcon>
                              )}
                            </Group>
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((row, index) => (
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
        {results?.data?.length > 0 && (results._pagination?.next || results._pagination?.previous) && (
          <Group position="center">
            <Pagination
              value={page}
              onChange={setPage}
              total={10} // This would need to be calculated based on total results
            />
          </Group>
        )}

        {/* Query Info */}
        {results && (
          <Paper p="md" withBorder>
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Query executed at: {new Date(results.executedAt).toLocaleString()}
              </Text>
              <Text size="sm" color="dimmed">
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
