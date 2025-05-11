import { useState, useMemo } from 'react';
import {
  Table,
  Paper,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  Stack,
  Select,
  TextInput,
  Button,
  Menu,
  Box,
  NumberInput,
  ScrollArea,
} from '@mantine/core';
import {
  IconSortAscending,
  IconSortDescending,
  IconFilter,
  IconSearch,
  IconDownload,
  IconColumns,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import { DiscoverTableResult } from '../../api/discoverApi';

interface ResultsTableProps {
  data: DiscoverTableResult | null;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
}

export function ResultsTable({ data, loading, onSort }: ResultsTableProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Stack align="center" gap="md">
          <Text color="dimmed">Loading results...</Text>
          <Box w={40} h={40}>
            <svg className="animate-spin" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </Box>
        </Stack>
      </Paper>
    );
  }

  if (!data) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          Execute a query to see results
        </Text>
      </Paper>
    );
  }

  // Get column names from metadata
  const columns = Object.keys(data.meta.fields);
  
  // Initialize visible columns if empty
  if (visibleColumns.size === 0) {
    setVisibleColumns(new Set(columns));
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data?.data) return { filtered: [], paginated: [] };
    
    let filtered = data.data;

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filter]) => {
      if (filter) {
        filtered = filtered.filter((row) => {
          const value = row[column];
          return String(value).toLowerCase().includes(filter.toLowerCase());
        });
      }
    });

    // Apply global search
    if (searchTerm) {
      filtered = filtered.filter((row) => {
        return Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
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

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filtered.slice(startIndex, endIndex);

    return { filtered, paginated };
  }, [data?.data, columnFilters, searchTerm, sortField, sortDirection, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    
    if (onSort) {
      onSort(field, sortDirection);
    }
  };

  const exportToCsv = () => {
    const headers = columns.filter(col => visibleColumns.has(col));
    const csvContent = [
      headers.join(','),
      ...processedData.paginated.map((row: Record<string, any>) => 
        headers.map(col => JSON.stringify(row[col] ?? '')).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discover-results-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    const fieldType = data.meta.fields[field];
    
    if (fieldType === 'timestamp' || fieldType === 'datetime') {
      return new Date(value).toLocaleString();
    }
    
    if (fieldType === 'duration' && typeof value === 'number') {
      return `${value.toFixed(2)}ms`;
    }
    
    if (typeof value === 'number' && fieldType !== 'integer') {
      return value.toLocaleString();
    }
    
    return String(value);
  };

  const getFieldIcon = (field: string) => {
    const fieldType = data.meta.fields[field];
    if (fieldType === 'timestamp' || fieldType === 'datetime') return '📅';
    if (fieldType === 'number' || fieldType === 'integer') return '🔢';
    if (fieldType === 'duration') return '⏱️';
    if (fieldType === 'string') return '📝';
    return '📊';
  };

  return (
    <Stack>
      <Group justify="space-between" mb="md">
        <Group>
          <TextInput
            placeholder="Search all fields..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ width: 300 }}
          />
          <Select
            value={String(pageSize)}
            onChange={(value) => setPageSize(Number(value))}
            data={[
              { value: '25', label: '25 rows' },
              { value: '50', label: '50 rows' },
              { value: '100', label: '100 rows' },
            ]}
            style={{ width: 120 }}
          />
        </Group>
        
        <Group>
          <Menu shadow="md" width={250}>
            <Menu.Target>
              <Button 
                variant="subtle" 
                leftSection={<IconColumns size={16} />}
                rightSection={
                  <Badge size="xs" variant="filled">
                    {visibleColumns.size}
                  </Badge>
                }
              >
                Columns
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Toggle Columns</Menu.Label>
              {columns.map((column) => (
                <Menu.Item
                  key={column}
                  onClick={() => {
                    const newVisible = new Set(visibleColumns);
                    if (newVisible.has(column)) {
                      newVisible.delete(column);
                    } else {
                      newVisible.add(column);
                    }
                    setVisibleColumns(newVisible);
                  }}
                >
                  <Group>
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column)}
                      readOnly
                    />
                    <Text size="sm">{column}</Text>
                  </Group>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          
          <Button
            variant="subtle"
            leftSection={<IconDownload size={16} />}
            onClick={exportToCsv}
          >
            Export CSV
          </Button>
          <Group>
            <ActionIcon 
              variant="subtle"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              title="Previous Page"
            >
              <IconArrowUp size={18} />
            </ActionIcon>
            
            <NumberInput
              value={currentPage}
              onChange={(value) => setCurrentPage(Number(value) || 1)}
              min={1}
              max={Math.ceil(processedData.filtered.length / pageSize)}
              style={{ width: 80 }}
              placeholder="Page"
              rightSection={
                <Text size="xs" color="dimmed">
                  / {Math.ceil(processedData.filtered.length / pageSize)}
                </Text>
              }
            />
            
            <ActionIcon 
              variant="subtle"
              disabled={currentPage >= Math.ceil(processedData.filtered.length / pageSize)}
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(processedData.filtered.length / pageSize), prev + 1))}
              title="Next Page"
            >
              <IconArrowDown size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Group>

      <Paper withBorder style={{ width: '100%' }}>
        <ScrollArea>
          <Table striped highlightOnHover style={{ minWidth: 800 }}>
            <thead>
              <tr>
                {columns
                  .filter((column) => visibleColumns.has(column))
                  .map((column) => (
                    <th key={column} style={{ position: 'relative' }}>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {getFieldIcon(column)} {column}
                        </Text>
                        <Tooltip label={`Sort by ${column}`}>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => handleSort(column)}
                          >
                            {sortField === column ? (
                              sortDirection === 'asc' ? (
                                <IconSortAscending size={14} />
                              ) : (
                                <IconSortDescending size={14} />
                              )
                            ) : (
                              <IconSortAscending size={14} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <TextInput
                        size="xs"
                        placeholder="Filter..."
                        value={columnFilters[column] || ''}
                        onChange={(e) => {
                          setColumnFilters({
                            ...columnFilters,
                            [column]: e.currentTarget.value,
                          });
                        }}
                        leftSection={<IconFilter size={12} />}
                        mt={4}
                      />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {!processedData.paginated || processedData.paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <Text ta="center" c="dimmed" py="md">
                      No results found
                    </Text>
                  </td>
                </tr>
              ) : (
                processedData.paginated.map((row: Record<string, any>, index) => (
                  <tr key={index}>
                    {columns
                      .filter((column) => visibleColumns.has(column))
                      .map((column) => (
                        <td key={column}>
                          <Tooltip label={formatValue(row[column], column)} disabled={!row[column] || String(row[column]).length < 50}>
                            <Text size="sm" lineClamp={2}>
                              {formatValue(row[column], column)}
                            </Text>
                          </Tooltip>
                        </td>
                      ))}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Showing {processedData.paginated.length} of {processedData.filtered.length} results
          {searchTerm || Object.keys(columnFilters).length > 0
            ? ` (filtered from ${data.data.length} total)`
            : ''}
        </Text>
        <Badge>{data.meta.fields && Object.keys(data.meta.fields).length} fields</Badge>
      </Group>
    </Stack>
  );
}
