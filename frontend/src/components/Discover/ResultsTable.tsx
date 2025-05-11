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

  if (!data) {
    return (
      <Paper p="md" withBorder>
        <Text color="dimmed" align="center">
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

    return filtered;
  }, [data.data, columnFilters, searchTerm, sortField, sortDirection]);

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
      ...processedData.map(row => 
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
      <Group position="apart" mb="md">
        <TextInput
          placeholder="Search all fields..."
          icon={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          style={{ width: 300 }}
        />
        
        <Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" leftIcon={<IconColumns size={16} />}>
                Columns ({visibleColumns.size}/{columns.length})
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
            leftIcon={<IconDownload size={16} />}
            onClick={exportToCsv}
          >
            Export CSV
          </Button>
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
                    <th key={column}>
                      <Group spacing="xs" noWrap>
                        <Text size="sm" weight={500}>
                          {getFieldIcon(column)} {column}
                        </Text>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          onClick={() => handleSort(column)}
                        >
                          {sortField === column ? (
                            sortDirection === 'asc' ? (
                              <IconArrowUp size={14} />
                            ) : (
                              <IconArrowDown size={14} />
                            )
                          ) : (
                            <IconSortAscending size={14} />
                          )}
                        </ActionIcon>
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
                        icon={<IconFilter size={12} />}
                        mt={4}
                      />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <Text align="center" color="dimmed" py="md">
                      No results found
                    </Text>
                  </td>
                </tr>
              ) : (
                processedData.map((row, index) => (
                  <tr key={index}>
                    {columns
                      .filter((column) => visibleColumns.has(column))
                      .map((column) => (
                        <td key={column}>
                          <Text size="sm" lineClamp={2}>
                            {formatValue(row[column], column)}
                          </Text>
                        </td>
                      ))}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Group position="apart">
        <Text size="sm" color="dimmed">
          {processedData.length} results
          {searchTerm || Object.keys(columnFilters).length > 0
            ? ` (filtered from ${data.data.length})`
            : ''}
        </Text>
        <Badge>{data.meta.fields && Object.keys(data.meta.fields).length} fields</Badge>
      </Group>
    </Stack>
  );
}
