// File: src/components/Monitoring/ErrorDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Paper, 
  Title, 
  Group, 
  Select, 
  Text, 
  Badge, 
  Stack, 
  Card, 
  SimpleGrid, 
  useMantineTheme,
  Loader,
  Button,
  ActionIcon,
  Tooltip,
  Tabs,
  Alert,
  Divider,
  Table,
  ScrollArea
} from '@mantine/core';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  IconAlertCircle, 
  IconChartBar, 
  IconUsers, 
  IconAlertTriangle,
  IconInfoCircle,
  IconFilter,
  IconExternalLink
} from '@tabler/icons-react';

import { withErrorBoundary } from '../../utils/errorHandling';
import RefreshableContainer from '../ErrorHandling/RefreshableContainer';
import errorAnalyticsApi from '../../api/errorAnalyticsApi';
import type { 
  ErrorAnalyticsData,
  ErrorCountByCategory,
  ErrorCountByTime,
  ErrorDetails,
  TimeRange,
  ErrorAnalyticsParams
} from '../../api/errorAnalyticsApi';

/**
 * Impact badge colors
 */
const IMPACT_COLORS: Record<string, string> = {
  High: 'red',
  Medium: 'yellow',
  Low: 'blue',
};

/**
 * Format date to locale string
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

/**
 * CategoryBarChart component
 */
const CategoryBarChart: React.FC<{ data: ErrorCountByCategory[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <RechartsTooltip />
        <Bar dataKey="count" fill="#8884d8">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={data[index].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * TimeLineChart component
 */
const TimeLineChart: React.FC<{ 
  data: ErrorCountByTime[],
  timeRange: TimeRange 
}> = ({ data, timeRange }) => {
  
  // Format time labels based on time range
  const formatTimeLabel = (time: number): string => {
    switch (timeRange) {
      case '1h':
        return `${time * 5} min`;
      case '6h':
        return `${time * 15} min`;
      case '24h':
        return `${time}h`;
      case '7d':
        return `Day ${Math.floor(time / 4) + 1} ${(time % 4) * 6}h`;
      default:
        return `Day ${time + 1}`;
    }
  };
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tickFormatter={formatTimeLabel}
        />
        <YAxis />
        <RechartsTooltip 
          formatter={(value, name) => [value, name]}
          labelFormatter={(time) => formatTimeLabel(Number(time))}
        />
        <Line type="monotone" dataKey="network" stroke="#FF6B6B" strokeWidth={2} />
        <Line type="monotone" dataKey="client_error" stroke="#FFD166" strokeWidth={2} />
        <Line type="monotone" dataKey="server_error" stroke="#F72585" strokeWidth={2} />
        <Line type="monotone" dataKey="timeout" stroke="#FF9E7A" strokeWidth={2} />
        <Line type="monotone" dataKey="validation_error" stroke="#7209B7" strokeWidth={2} />
        <Line type="monotone" dataKey="auth_error" stroke="#4CC9F0" strokeWidth={2} />
        <Line type="monotone" dataKey="llm_api_error" stroke="#7678ED" strokeWidth={2} />
        <Line type="monotone" dataKey="unknown" stroke="#B8B8B8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Impact distribution chart
 */
const ImpactPieChart: React.FC<{ data: ErrorDetails[] }> = ({ data }) => {
  // Transform data for the pie chart
  const impactData = [
    { name: 'High', value: data.filter(d => d.impact === 'High').length },
    { name: 'Medium', value: data.filter(d => d.impact === 'Medium').length },
    { name: 'Low', value: data.filter(d => d.impact === 'Low').length },
  ];
  
  const COLORS = ['#FF6B6B', '#FFD166', '#4CC9F0'];
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={impactData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {impactData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Summary cards component
 */
const SummaryCards: React.FC<{ summary: ErrorAnalyticsData['summary'] }> = ({ summary }) => {
  return (
    <SimpleGrid cols={4} gap="lg" className="custom-grid">
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="apart">
          <Text size="sm" color="dimmed">Total Errors</Text>
          <IconChartBar size={20} color="blue" />
        </Group>
        <Text size="xl" fw={700} my="sm">{summary.totalErrors}</Text>
        <Text size="xs" color="dimmed">
          {summary.uniqueErrors} unique error types
        </Text>
      </Card>
      
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="apart">
          <Text size="sm" color="dimmed">Affected Users</Text>
          <IconUsers size={20} color="green" />
        </Group>
        <Text size="xl" fw={700} my="sm">{summary.affectedUsers}</Text>
        <Text size="xs" color="dimmed">
          Most common: {summary.mostCommonCategory}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="apart">
          <Text size="sm" color="dimmed">High Impact</Text>
          <IconAlertTriangle size={20} color="red" />
        </Group>
        <Text size="xl" fw={700} my="sm">{summary.highImpactErrors}</Text>
        <Text size="xs" color="dimmed">
          Critical errors to address
        </Text>
      </Card>
      
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="apart">
          <Text size="sm" color="dimmed">Trending</Text>
          <IconAlertCircle size={20} color="orange" />
        </Group>
        <Text size="xl" fw={700} my="sm">{summary.trendingErrors.length}</Text>
        <Text size="xs" color="dimmed">
          {summary.trendingErrors[0]?.type || 'No trending errors'}
        </Text>
      </Card>
    </SimpleGrid>
  );
};

/**
 * Error list component
 */
const ErrorList: React.FC<{ 
  errors: ErrorDetails[],
  onViewDetails: (error: ErrorDetails) => void
}> = ({ errors, onViewDetails }) => {
  return (
    <Stack gap="md">
      {errors.map((error) => (
        <Card key={error.id} p="sm" withBorder>
          <Group justify="apart">
            <div>
              <Group gap="xs">
                <Text fw={500}>{error.type}</Text>
                <Badge size="sm" color={error.category ? undefined : 'gray'}>{error.category}</Badge>
              </Group>
              <Text size="sm" color="dimmed" lineClamp={1}>{error.message}</Text>
            </div>
            <Group spacing="xs">
              <Badge color={IMPACT_COLORS[error.impact]}>{error.impact} Impact</Badge>
              <Badge color="gray">{error.count} Occurrences</Badge>
              <Tooltip label="View Details">
                <ActionIcon onClick={() => onViewDetails(error)}>
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Group justify="apart" mt="sm">
            <Text size="xs" color="dimmed">First seen: {formatDate(error.firstSeen)}</Text>
            <Text size="xs" color="dimmed">Last seen: {formatDate(error.lastSeen)}</Text>
            <Text size="xs" color="dimmed">Users: {error.userCount}</Text>
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

/**
 * Error details modal
 */
const ErrorDetailsView: React.FC<{ 
  error: ErrorDetails | null,
  onClose: () => void
}> = ({ error, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  
  // Fetch error occurrences
  useEffect(() => {
    if (error) {
      setLoading(true);
      errorAnalyticsApi.getErrorOccurrences(error.id, { limit: 10 })
        .then(data => {
          setOccurrences(data.occurrences);
        })
        .catch(err => {
          console.error('Failed to fetch occurrences:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [error]);
  
  if (!error) return null;
  
  return (
    <Paper p="md" shadow="md" radius="md" withBorder>
      <Group justify="apart" mb="md">
        <Title order={3}>{error.type}</Title>
        <Button variant="subtle" onClick={onClose}>Close</Button>
      </Group>
      
      <Group justify="apart" mb="lg">
        <Group gap="xs">
          <Badge color={IMPACT_COLORS[error.impact]}>{error.impact} Impact</Badge>
          <Badge color={error.category ? undefined : 'gray'}>{error.category}</Badge>
          <Badge>{error.count} Occurrences</Badge>
          <Badge>{error.userCount} Users</Badge>
        </Group>
      </Group>
      
      <Alert color="gray" mb="md">
        <Text>{error.message}</Text>
      </Alert>
      
      <Tabs defaultValue="occurrences">
        <Tabs.List>
          <Tabs.Tab value="occurrences">Recent Occurrences</Tabs.Tab>
          <Tabs.Tab value="stats">Statistics</Tabs.Tab>
          <Tabs.Tab value="solutions">Solutions</Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="occurrences" pt="md">
          {loading ? (
            <Group justify="center" py="lg">
              <Loader />
            </Group>
          ) : occurrences.length > 0 ? (
            <ScrollArea h={300}>
              <Table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map((occurrence, index) => (
                    <tr key={index}>
                      <td>{formatDate(occurrence.timestamp)}</td>
                      <td>{occurrence.userId || 'Anonymous'}</td>
                      <td>{occurrence.details || 'No details'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          ) : (
            <Text color="dimmed" py="md">No recent occurrences found.</Text>
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="stats" pt="md">
          <Stack gap="md">
            <Group justify="apart">
              <Text>First seen:</Text>
              <Text fw={500}>{formatDate(error.firstSeen)}</Text>
            </Group>
            <Divider />
            <Group justify="apart">
              <Text>Last seen:</Text>
              <Text fw={500}>{formatDate(error.lastSeen)}</Text>
            </Group>
            <Divider />
            <Group justify="apart">
              <Text>Total occurrences:</Text>
              <Text fw={500}>{error.count}</Text>
            </Group>
            <Divider />
            <Group justify="apart">
              <Text>Affected users:</Text>
              <Text fw={500}>{error.userCount}</Text>
            </Group>
          </Stack>
        </Tabs.Panel>
        
        <Tabs.Panel value="solutions" pt="md">
          <Alert icon={<IconInfoCircle />} color="blue">
            <Text>Suggested solutions for this error:</Text>
            <Stack mt="md">
              <Text size="sm">• Check network connectivity if error persists</Text>
              <Text size="sm">• Verify API credentials and permissions</Text>
              <Text size="sm">• Implement retry mechanism for transient failures</Text>
              <Text size="sm">• Add error boundary to prevent UI crashes</Text>
            </Stack>
          </Alert>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

/**
 * ErrorDashboard component
 */
const ErrorDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [impactFilter, setImpactFilter] = useState<string>('');
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  
  // Fetch error analytics data with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['errorAnalytics', timeRange, categoryFilter, impactFilter],
    queryFn: async () => errorAnalyticsApi.getErrorAnalytics({
      timeRange,
      category: categoryFilter || undefined,
      impact: impactFilter || undefined
    }),
    enabled: process.env.NODE_ENV === 'production',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount) => {
      return failureCount < 3;
    }
  });
  
  // For development, use mock data
  const errorData = data || errorAnalyticsApi.generateMockErrorAnalytics({ timeRange });
  
  // Filter errors based on category and impact
  const filteredErrors = errorData.topErrors?.filter((error: ErrorDetails) => {
    if (categoryFilter && error.category !== categoryFilter) return false;
    if (impactFilter && error.impact !== impactFilter) return false;
    return true;
  }) || [];
  
  // Handle error details view
  const handleViewErrorDetails = (error: ErrorDetails) => {
    setSelectedError(error);
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    await refetch();
  };
  
  return (
    <Stack gap="lg">
      <Title order={2}>Error Monitoring Dashboard</Title>
      
      <Group justify="apart">
        <Text>View error trends and patterns to identify issues</Text>
        <Group spacing="md">
          <Select
            label="Time Range"
            value={timeRange}
            onChange={(value) => setTimeRange(value as TimeRange)}
            data={[
              { value: '1h', label: 'Last Hour' },
              { value: '6h', label: 'Last 6 Hours' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ]}
            style={{ width: 200 }}
          />
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(value: string | null) => setCategoryFilter(value || '')}
            data={[
              { value: '', label: 'All Categories' },
              ...errorData.byCategory.map(category => ({
                value: category.name,
                label: category.name
              }))
            ]}
            style={{ width: 200 }}
            clearable
          />
          <Select
            label="Impact"
            value={impactFilter}
            onChange={(value: string | null) => setImpactFilter(value || '')}
            data={[
              { value: '', label: 'All Impacts' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
            style={{ width: 150 }}
            clearable
          />
        </Group>
      </Group>
      
      {/* Summary cards */}
      <SummaryCards summary={errorData.summary || {}} />
      
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
        <RefreshableContainer 
          title="Errors by Category"
          onRefresh={handleRefresh}
          showRefreshButton
        >
          <CategoryBarChart data={errorData.byCategory || []} />
        </RefreshableContainer>
        
        <RefreshableContainer 
          title="Errors Over Time"
          onRefresh={handleRefresh}
          showRefreshButton
        >
          <TimeLineChart data={errorData.byTime || []} timeRange={timeRange} />
        </RefreshableContainer>
        
        <RefreshableContainer 
          title="Impact Distribution"
          onRefresh={handleRefresh}
          showRefreshButton
        >
          <ImpactPieChart data={errorData.topErrors || []} />
        </RefreshableContainer>
      </SimpleGrid>
      
      <RefreshableContainer 
        title={`Top Errors ${categoryFilter ? `(${categoryFilter})` : ''} ${impactFilter ? `(${impactFilter} Impact)` : ''}`}
        onRefresh={handleRefresh}
        showRefreshButton
        actions={
          <Button 
            variant="light" 
            size="xs"
            leftSection={<IconFilter size={14} />}
            onClick={() => {
              setCategoryFilter('');
              setImpactFilter('');
            }}
            disabled={!categoryFilter && !impactFilter}
          >
            Clear Filters
          </Button>
        }
      >
        {filteredErrors.length > 0 ? (
          <ErrorList 
            errors={filteredErrors} 
            onViewDetails={handleViewErrorDetails}
          />
        ) : (
          <Alert color="gray">
            No errors match the selected filters. Try adjusting your filters or time range.
          </Alert>
        )}
      </RefreshableContainer>
      
      {selectedError && (
        <ErrorDetailsView 
          error={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}
    </Stack>
  );
};

// Export with error boundary
export default withErrorBoundary(ErrorDashboard, {
  name: 'ErrorDashboard',
  showDetails: false,
});
