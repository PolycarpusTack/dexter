import React, { useEffect, useState, useCallback } from 'react';
import {
  Paper,
  Title,
  Group,
  Text,
  Card,
  Badge,
  SimpleGrid,
  useMantineTheme,
  Stack,
  Tabs,
  Box,
  Select,
  Progress,
  RingProgress,
  Divider
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconChartLine,
  IconAlertTriangle,
  IconUserCircle,
  IconNetwork,
  IconPuzzle,
  IconClock,
  IconSearch,
  IconArrowRight,
  IconDeviceDesktop
} from '@tabler/icons-react';
import telemetry, { TelemetryEvent } from '../../services/telemetry';
import { getAuditLogs, AuditLogEvent } from '../../hooks/useAuditLog';

interface MetricSummary {
  name: string;
  value: number;
  unit: string;
  change?: number;
  changeUnit?: '%' | 'absolute';
  status?: 'positive' | 'negative' | 'neutral';
}

interface ErrorSummary {
  count: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  topErrors: Array<{
    message: string;
    count: number;
    category: string;
    severity: string;
  }>;
}

interface UserSummary {
  activeUsers: number;
  sessions: number;
  averageSessionDuration: number;
  topComponents: Array<{
    name: string;
    interactionCount: number;
  }>;
}

interface TelemetryData {
  performanceMetrics: MetricSummary[];
  errors: ErrorSummary;
  users: UserSummary;
  recentEvents: TelemetryEvent[];
  recentAuditLogs: AuditLogEvent[];
}

/**
 * Dashboard for visualizing telemetry and monitoring data
 */
const TelemetryDashboard: React.FC = () => {
  const theme = useMantineTheme();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useLocalStorage<string>({
    key: 'telemetry-dashboard-time-range',
    defaultValue: '24h'
  });
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [subscriberId, setSubscriberId] = useState<string | null>(null);
  
  /**
   * Load and process telemetry data
   */
  const loadData = useCallback(() => {
    setIsLoading(true);
    
    // In a real application, this would fetch data from a telemetry API
    // For this implementation, we'll simulate data and use locally stored audit logs
    
    try {
      // Get audit logs from localStorage
      const auditLogs = getAuditLogs();
      
      // Calculate time range in milliseconds
      let timeRangeMs = 24 * 60 * 60 * 1000; // Default 24 hours
      
      if (timeRange === '1h') {
        timeRangeMs = 60 * 60 * 1000;
      } else if (timeRange === '6h') {
        timeRangeMs = 6 * 60 * 60 * 1000;
      } else if (timeRange === '7d') {
        timeRangeMs = 7 * 24 * 60 * 60 * 1000;
      } else if (timeRange === '30d') {
        timeRangeMs = 30 * 24 * 60 * 60 * 1000;
      }
      
      // Filter logs by time range
      const now = Date.now();
      const filteredLogs = auditLogs.filter(log => (now - log.timestamp) <= timeRangeMs);
      
      // Process logs to extract metrics
      const components = new Map<string, number>();
      const uniqueUsers = new Set<string>();
      const sessions = new Set<string>();
      
      filteredLogs.forEach(log => {
        // Count component interactions
        const component = log.component || 'unknown';
        components.set(component, (components.get(component) || 0) + 1);
        
        // Count unique users
        if (log.actor) {
          uniqueUsers.add(log.actor);
        }
        
        // Count sessions (simulated with date-based grouping)
        const hour = new Date(log.timestamp).toISOString().substring(0, 13);
        if (log.actor) {
          sessions.add(`${log.actor}:${hour}`);
        }
      });
      
      // Convert to sorted array
      const topComponents = Array.from(components.entries())
        .map(([name, count]) => ({ name, interactionCount: count }))
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, 5);
      
      // Simulate performance metrics
      const performanceMetrics: MetricSummary[] = [
        {
          name: 'Page Load Time',
          value: 1350,
          unit: 'ms',
          change: -8.5,
          changeUnit: '%',
          status: 'positive'
        },
        {
          name: 'API Response Time',
          value: 245,
          unit: 'ms',
          change: 2.3,
          changeUnit: '%',
          status: 'negative'
        },
        {
          name: 'Component Render Time',
          value: 125,
          unit: 'ms',
          change: -15.0,
          changeUnit: '%',
          status: 'positive'
        },
        {
          name: 'Memory Usage',
          value: 58.4,
          unit: 'MB',
          change: 5.2,
          changeUnit: '%',
          status: 'neutral'
        }
      ];
      
      // Simulate error data
      const errors: ErrorSummary = {
        count: Math.floor(Math.random() * 20),
        byCategory: {
          'network': Math.floor(Math.random() * 10),
          'api': Math.floor(Math.random() * 5),
          'rendering': Math.floor(Math.random() * 3),
          'unknown': Math.floor(Math.random() * 2)
        },
        bySeverity: {
          'error': Math.floor(Math.random() * 15),
          'warning': Math.floor(Math.random() * 10),
          'info': Math.floor(Math.random() * 5)
        },
        topErrors: [
          {
            message: 'Failed to fetch data from API',
            count: Math.floor(Math.random() * 10),
            category: 'api',
            severity: 'error'
          },
          {
            message: 'Network request timeout',
            count: Math.floor(Math.random() * 8),
            category: 'network',
            severity: 'error'
          },
          {
            message: 'Component failed to render',
            count: Math.floor(Math.random() * 5),
            category: 'rendering',
            severity: 'error'
          }
        ]
      };
      
      // Build user summary
      const users: UserSummary = {
        activeUsers: uniqueUsers.size,
        sessions: sessions.size,
        averageSessionDuration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
        topComponents
      };
      
      // Combine all data
      setData({
        performanceMetrics,
        errors,
        users,
        recentEvents: [], // Would come from telemetry API in real implementation
        recentAuditLogs: filteredLogs.slice(-10).reverse() // Last 10 logs, most recent first
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load telemetry data:', error);
      setIsLoading(false);
    }
  }, [timeRange]);
  
  // Load data on mount and when time range changes
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Subscribe to telemetry events
  useEffect(() => {
    // Subscribe to all telemetry events
    const id = telemetry.subscribe('all', (event) => {
      // In a production app, we would update the dashboard in real-time
      // Here we'll just log the event
      console.log('Telemetry event received:', event);
      
      // Reload dashboard data if appropriate
      // This is simplified - a real implementation would update specific sections
      if (event.type === 'error' || event.type === 'user_interaction') {
        loadData();
      }
    });
    
    setSubscriberId(id);
    
    // Unsubscribe on unmount
    return () => {
      if (subscriberId) {
        telemetry.unsubscribe(subscriberId);
      }
    };
  }, [loadData]);
  
  // Render loading state
  if (isLoading || !data) {
    return (
      <Paper p="md" shadow="xs">
        <Title order={2} mb="md">Telemetry Dashboard</Title>
        <Text>Loading telemetry data...</Text>
        <Progress mt="md" value={100} animate />
      </Paper>
    );
  }
  
  // Helper function to render metrics
  const renderMetric = (metric: MetricSummary) => (
    <Card key={metric.name} withBorder shadow="sm" p="md">
      <Stack spacing="xs">
        <Group position="apart" noWrap>
          <Text size="sm" color="dimmed">{metric.name}</Text>
          {metric.change !== undefined && (
            <Badge 
              color={
                metric.status === 'positive' ? 'green' : 
                metric.status === 'negative' ? 'red' : 'gray'
              }
              leftSection={
                metric.status === 'positive' ? '↓' : 
                metric.status === 'negative' ? '↑' : '•'
              }
              size="sm"
            >
              {Math.abs(metric.change)}{metric.changeUnit}
            </Badge>
          )}
        </Group>
        <Text size="xl" fw={700}>{metric.value}{metric.unit}</Text>
      </Stack>
    </Card>
  );
  
  return (
    <Paper p="md" shadow="xs">
      <Group position="apart" mb="md">
        <Title order={2}>Telemetry Dashboard</Title>
        <Group>
          <Select
            size="xs"
            value={timeRange}
            onChange={(value) => setTimeRange(value || '24h')}
            data={[
              { value: '1h', label: 'Last hour' },
              { value: '6h', label: 'Last 6 hours' },
              { value: '24h', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' }
            ]}
          />
        </Group>
      </Group>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="overview" leftSection={<IconChartLine size={14} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="performance" leftSection={<IconClock size={14} />}>
            Performance
          </Tabs.Tab>
          <Tabs.Tab 
            value="errors" 
            leftSection={<IconAlertTriangle size={14} />}
            rightSection={
              <Badge size="xs" variant="filled" color="red">
                {data.errors.count}
              </Badge>
            }
          >
            Errors
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUserCircle size={14} />}>
            User Activity
          </Tabs.Tab>
          <Tabs.Tab value="audit" leftSection={<IconSearch size={14} />}>
            Audit Log
          </Tabs.Tab>
        </Tabs.List>
        
        {/* Overview Tab */}
        <Tabs.Panel value="overview">
          <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="md">
            <Card withBorder shadow="sm" p="md">
              <Group spacing="xs" noWrap>
                <Box style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 24, 
                  backgroundColor: theme.colors.blue[0],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconClock size={24} color={theme.colors.blue[6]} />
                </Box>
                <Stack spacing={0}>
                  <Text size="sm" color="dimmed">Performance</Text>
                  <Text fw={700} size="xl">
                    {data.performanceMetrics[0].value}{data.performanceMetrics[0].unit}
                  </Text>
                  <Text size="xs" color="dimmed">Page load time</Text>
                </Stack>
              </Group>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Group spacing="xs" noWrap>
                <Box style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 24, 
                  backgroundColor: theme.colors.red[0],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconAlertTriangle size={24} color={theme.colors.red[6]} />
                </Box>
                <Stack spacing={0}>
                  <Text size="sm" color="dimmed">Errors</Text>
                  <Text fw={700} size="xl">{data.errors.count}</Text>
                  <Text size="xs" color="dimmed">Total errors</Text>
                </Stack>
              </Group>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Group spacing="xs" noWrap>
                <Box style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 24, 
                  backgroundColor: theme.colors.green[0],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconUserCircle size={24} color={theme.colors.green[6]} />
                </Box>
                <Stack spacing={0}>
                  <Text size="sm" color="dimmed">Users</Text>
                  <Text fw={700} size="xl">{data.users.activeUsers}</Text>
                  <Text size="xs" color="dimmed">Active users</Text>
                </Stack>
              </Group>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Group spacing="xs" noWrap>
                <Box style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 24, 
                  backgroundColor: theme.colors.violet[0],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconNetwork size={24} color={theme.colors.violet[6]} />
                </Box>
                <Stack spacing={0}>
                  <Text size="sm" color="dimmed">API Calls</Text>
                  <Text fw={700} size="xl">
                    {data.performanceMetrics[1].value}{data.performanceMetrics[1].unit}
                  </Text>
                  <Text size="xs" color="dimmed">Avg response time</Text>
                </Stack>
              </Group>
            </Card>
          </SimpleGrid>
          
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="md">
            <Card withBorder shadow="sm" p="md">
              <Stack spacing="xs">
                <Text fw={500}>Recent Activity</Text>
                <Box>
                  {data.recentAuditLogs.length > 0 ? (
                    data.recentAuditLogs.slice(0, 5).map((log, index) => (
                      <Group key={index} position="apart" mb="xs" pt="xs" pb="xs" style={{ borderBottom: index < 4 ? `1px solid ${theme.colors.gray[2]}` : undefined }}>
                        <Stack spacing={2}>
                          <Text size="sm">{log.action}</Text>
                          <Text size="xs" color="dimmed">{log.component}</Text>
                        </Stack>
                        <Text size="xs" color="dimmed">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                      </Group>
                    ))
                  ) : (
                    <Text color="dimmed" size="sm">No recent activity</Text>
                  )}
                </Box>
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Stack spacing="xs">
                <Text fw={500}>Top Components</Text>
                <Box>
                  {data.users.topComponents.map((component, index) => (
                    <Stack key={index} spacing={2} mb="xs">
                      <Group position="apart">
                        <Text size="sm">{component.name}</Text>
                        <Text size="sm" fw={500}>{component.interactionCount}</Text>
                      </Group>
                      <Progress 
                        value={(component.interactionCount / data.users.topComponents[0].interactionCount) * 100} 
                        size="sm" 
                        color={theme.colors.blue[6]} 
                      />
                    </Stack>
                  ))}
                </Box>
              </Stack>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>
        
        {/* Performance Tab */}
        <Tabs.Panel value="performance">
          <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            {data.performanceMetrics.map(metric => renderMetric(metric))}
          </SimpleGrid>
          
          <Card withBorder shadow="sm" p="md" mt="md">
            <Title order={4} mb="md">Performance Breakdown</Title>
            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
              <Box>
                <Group position="apart" mb="md">
                  <Text>Backend vs Frontend Time</Text>
                </Group>
                <Group position="center">
                  <RingProgress
                    sections={[
                      { value: 35, color: theme.colors.blue[6], tooltip: 'Backend: 35%' },
                      { value: 65, color: theme.colors.violet[6], tooltip: 'Frontend: 65%' }
                    ]}
                    label={
                      <Stack align="center" spacing={0}>
                        <Text size="xl" fw={700}>35%</Text>
                        <Text size="xs" color="dimmed">Backend</Text>
                      </Stack>
                    }
                    size={180}
                  />
                </Group>
                <Divider my="md" />
                <Group position="apart">
                  <Group>
                    <Box w={12} h={12} bg={theme.colors.blue[6]} />
                    <Text size="sm">Backend</Text>
                  </Group>
                  <Text size="sm" fw={500}>35%</Text>
                </Group>
                <Group position="apart" mt="xs">
                  <Group>
                    <Box w={12} h={12} bg={theme.colors.violet[6]} />
                    <Text size="sm">Frontend</Text>
                  </Group>
                  <Text size="sm" fw={500}>65%</Text>
                </Group>
              </Box>
              
              <Box>
                <Text mb="md">Time Allocation</Text>
                <Stack spacing="xs">
                  <Box>
                    <Group position="apart">
                      <Text size="sm">Network</Text>
                      <Text size="sm" fw={500}>480ms</Text>
                    </Group>
                    <Progress value={35} size="md" color={theme.colors.blue[6]} />
                  </Box>
                  <Box>
                    <Group position="apart">
                      <Text size="sm">Processing</Text>
                      <Text size="sm" fw={500}>325ms</Text>
                    </Group>
                    <Progress value={24} size="md" color={theme.colors.violet[6]} />
                  </Box>
                  <Box>
                    <Group position="apart">
                      <Text size="sm">Rendering</Text>
                      <Text size="sm" fw={500}>410ms</Text>
                    </Group>
                    <Progress value={30} size="md" color={theme.colors.green[6]} />
                  </Box>
                  <Box>
                    <Group position="apart">
                      <Text size="sm">Other</Text>
                      <Text size="sm" fw={500}>135ms</Text>
                    </Group>
                    <Progress value={11} size="md" color={theme.colors.gray[6]} />
                  </Box>
                </Stack>
              </Box>
            </SimpleGrid>
          </Card>
        </Tabs.Panel>
        
        {/* Errors Tab */}
        <Tabs.Panel value="errors">
          <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="md">
            <Card withBorder shadow="sm" p="md">
              <Stack spacing="xs">
                <Text fw={500}>By Category</Text>
                <Stack spacing="xs">
                  {Object.entries(data.errors.byCategory).map(([category, count]) => (
                    <Group key={category} position="apart">
                      <Text size="sm">{category}</Text>
                      <Badge>{count}</Badge>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Stack spacing="xs">
                <Text fw={500}>By Severity</Text>
                <Stack spacing="xs">
                  {Object.entries(data.errors.bySeverity).map(([severity, count]) => (
                    <Group key={severity} position="apart">
                      <Text size="sm">{severity}</Text>
                      <Badge 
                        color={
                          severity === 'error' ? 'red' :
                          severity === 'warning' ? 'yellow' :
                          'blue'
                        }
                      >
                        {count}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Stack spacing="xs">
                <Text fw={500}>Error Rate</Text>
                <RingProgress
                  sections={[
                    { value: (data.errors.count / 100) * 100, color: theme.colors.red[6] }
                  ]}
                  label={
                    <Stack align="center" spacing={0}>
                      <Text size="xl" fw={700}>{(data.errors.count / 100).toFixed(1)}%</Text>
                      <Text size="xs" color="dimmed">Error Rate</Text>
                    </Stack>
                  }
                  size={120}
                />
              </Stack>
            </Card>
          </SimpleGrid>
          
          <Card withBorder shadow="sm" p="md">
            <Text fw={500} mb="md">Top Errors</Text>
            {data.errors.topErrors.map((error, index) => (
              <Box 
                key={index}
                p="sm"
                mb={index < data.errors.topErrors.length - 1 ? 'md' : 0}
                style={{
                  borderLeft: `4px solid ${
                    error.severity === 'error' ? theme.colors.red[6] :
                    error.severity === 'warning' ? theme.colors.yellow[6] :
                    theme.colors.blue[6]
                  }`,
                  backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
                }}
              >
                <Group position="apart" mb="xs">
                  <Text>{error.message}</Text>
                  <Badge color={
                    error.severity === 'error' ? 'red' :
                    error.severity === 'warning' ? 'yellow' :
                    'blue'
                  }>
                    {error.count}
                  </Badge>
                </Group>
                <Group spacing="md">
                  <Badge size="sm" variant="outline">{error.category}</Badge>
                  <Text size="xs" color="dimmed">Last occurred: 20 minutes ago</Text>
                </Group>
              </Box>
            ))}
          </Card>
        </Tabs.Panel>
        
        {/* Users Tab */}
        <Tabs.Panel value="users">
          <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="md">
            <Card withBorder shadow="sm" p="md">
              <Stack align="center" spacing="xs">
                <IconUserCircle size={32} color={theme.colors.blue[6]} />
                <Text fw={700} size="xl">{data.users.activeUsers}</Text>
                <Text size="sm" color="dimmed">Active Users</Text>
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Stack align="center" spacing="xs">
                <IconDeviceDesktop size={32} color={theme.colors.green[6]} />
                <Text fw={700} size="xl">{data.users.sessions}</Text>
                <Text size="sm" color="dimmed">Sessions</Text>
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Stack align="center" spacing="xs">
                <IconClock size={32} color={theme.colors.violet[6]} />
                <Text fw={700} size="xl">
                  {Math.floor(data.users.averageSessionDuration / 60)}m {data.users.averageSessionDuration % 60}s
                </Text>
                <Text size="sm" color="dimmed">Avg. Session Duration</Text>
              </Stack>
            </Card>
          </SimpleGrid>
          
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            <Card withBorder shadow="sm" p="md">
              <Text fw={500} mb="md">Top Components</Text>
              <Stack spacing="md">
                {data.users.topComponents.map((component, index) => (
                  <Box key={index}>
                    <Group position="apart" mb="xs">
                      <Text size="sm">{component.name}</Text>
                      <Text size="sm" fw={500}>{component.interactionCount}</Text>
                    </Group>
                    <Progress 
                      value={(component.interactionCount / data.users.topComponents[0].interactionCount) * 100} 
                      size="sm" 
                    />
                  </Box>
                ))}
              </Stack>
            </Card>
            
            <Card withBorder shadow="sm" p="md">
              <Text fw={500} mb="md">Device Distribution</Text>
              <Group position="center">
                <RingProgress
                  sections={[
                    { value: 65, color: theme.colors.blue[6], tooltip: 'Desktop: 65%' },
                    { value: 25, color: theme.colors.green[6], tooltip: 'Mobile: 25%' },
                    { value: 10, color: theme.colors.orange[6], tooltip: 'Tablet: 10%' }
                  ]}
                  label={
                    <Stack align="center" spacing={0}>
                      <Text size="xl" fw={700}>65%</Text>
                      <Text size="xs" color="dimmed">Desktop</Text>
                    </Stack>
                  }
                  size={160}
                />
              </Group>
              <Stack spacing="xs" mt="md">
                <Group position="apart">
                  <Group>
                    <Box w={12} h={12} bg={theme.colors.blue[6]} />
                    <Text size="sm">Desktop</Text>
                  </Group>
                  <Text size="sm" fw={500}>65%</Text>
                </Group>
                <Group position="apart">
                  <Group>
                    <Box w={12} h={12} bg={theme.colors.green[6]} />
                    <Text size="sm">Mobile</Text>
                  </Group>
                  <Text size="sm" fw={500}>25%</Text>
                </Group>
                <Group position="apart">
                  <Group>
                    <Box w={12} h={12} bg={theme.colors.orange[6]} />
                    <Text size="sm">Tablet</Text>
                  </Group>
                  <Text size="sm" fw={500}>10%</Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>
        
        {/* Audit Log Tab */}
        <Tabs.Panel value="audit">
          <Card withBorder shadow="sm" p="md" mb="md">
            <Group position="apart" mb="md">
              <Text fw={500}>Audit Log</Text>
              <Badge>{data.recentAuditLogs.length} events</Badge>
            </Group>
            
            {data.recentAuditLogs.length > 0 ? (
              <Stack spacing="md">
                {data.recentAuditLogs.map((log, index) => (
                  <Box 
                    key={index}
                    p="sm"
                    style={{
                      borderLeft: `3px solid ${theme.colors.blue[6]}`,
                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
                    }}
                  >
                    <Group position="apart" mb="xs">
                      <Group>
                        <Text fw={500}>{log.action}</Text>
                        {log.category && (
                          <Badge size="sm" variant="outline">{log.category}</Badge>
                        )}
                      </Group>
                      <Text size="xs" color="dimmed">
                        {new Date(log.timestamp).toLocaleString()}
                      </Text>
                    </Group>
                    <Group position="apart">
                      <Text size="sm" color="dimmed">{log.component}</Text>
                      {log.actor && (
                        <Group spacing="xs">
                          <IconUserCircle size={14} />
                          <Text size="xs">{log.actor}</Text>
                        </Group>
                      )}
                    </Group>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <Box 
                        mt="xs" 
                        p="xs" 
                        style={{ 
                          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
                          borderRadius: theme.radius.sm
                        }}
                      >
                        <Text size="xs" mb="xs">Details:</Text>
                        <Box style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box p="xl" style={{ textAlign: 'center' }}>
                <Text color="dimmed">No audit log events found</Text>
              </Box>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default TelemetryDashboard;