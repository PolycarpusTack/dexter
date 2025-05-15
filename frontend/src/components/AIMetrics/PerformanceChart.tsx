import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Title,
  Text,
  Skeleton,
  Group,
  Select,
  Stack,
  ThemeIcon,
  useMantineTheme
} from '@mantine/core';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  IconClockHour4, 
  IconChartLine, 
  IconCircleCheck, 
  IconCoin
} from '@tabler/icons-react';

import { useTimeSeriesData } from '../../api/unified/hooks/useMetrics';

interface PerformanceChartProps {
  modelId: string;
  metric: 'response_time' | 'success_rate' | 'request_count' | 'token_usage';
  period: 'hour' | 'day' | 'week' | 'month' | 'all';
  interval?: 'minute' | 'hour' | 'day';
  height?: number;
  title?: string;
}

/**
 * Performance chart for visualizing model metrics over time
 */
const PerformanceChart: React.FC<PerformanceChartProps> = ({
  modelId,
  metric,
  period,
  interval,
  height = 300,
  title
}) => {
  const theme = useMantineTheme();
  
  // Determine appropriate interval based on period if not specified
  const calculatedInterval = useMemo(() => {
    if (interval) return interval;
    
    switch (period) {
      case 'hour': return 'minute';
      case 'day': return 'hour';
      case 'week': 
      case 'month': return 'day';
      default: return 'day';
    }
  }, [period, interval]);
  
  // Fetch time series data
  const { data, isLoading, isError } = useTimeSeriesData(
    modelId,
    metric,
    period,
    calculatedInterval,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );
  
  // Format chart data
  const chartData = useMemo(() => {
    if (!data || !data.data) return [];
    
    return data.data.map((point: any) => {
      // Format timestamp for display
      const timestamp = new Date(point.timestamp);
      let formattedTime;
      
      if (calculatedInterval === 'minute') {
        formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (calculatedInterval === 'hour') {
        formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        formattedTime = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      
      // For token usage, convert to object with input/output
      if (metric === 'token_usage' && typeof point.value === 'object') {
        return {
          timestamp: formattedTime,
          input: point.value.input || 0,
          output: point.value.output || 0,
          total: point.value.total || 0
        };
      }
      
      // For other metrics, use value directly
      return {
        timestamp: formattedTime,
        value: point.value
      };
    });
  }, [data, calculatedInterval, metric]);
  
  // Get appropriate icon for metric
  const getMetricIcon = () => {
    switch (metric) {
      case 'response_time':
        return <IconClockHour4 size={20} />;
      case 'success_rate':
        return <IconCircleCheck size={20} />;
      case 'request_count':
        return <IconChartLine size={20} />;
      case 'token_usage':
        return <IconCoin size={20} />;
      default:
        return <IconChartLine size={20} />;
    }
  };
  
  // Get appropriate label for metric
  const getMetricLabel = () => {
    switch (metric) {
      case 'response_time':
        return 'Response Time (s)';
      case 'success_rate':
        return 'Success Rate (%)';
      case 'request_count':
        return 'Request Count';
      case 'token_usage':
        return 'Token Usage';
      default:
        return 'Value';
    }
  };
  
  // Get appropriate chart color
  const getMetricColor = () => {
    switch (metric) {
      case 'response_time':
        return theme.colors.blue[6];
      case 'success_rate':
        return theme.colors.green[6];
      case 'request_count':
        return theme.colors.violet[6];
      case 'token_usage':
        return theme.colors.orange[6];
      default:
        return theme.colors.blue[6];
    }
  };
  
  // Format the display value for the tooltip
  const formatValue = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    
    switch (metric) {
      case 'response_time':
        return `${value.toFixed(2)}s`;
      case 'success_rate':
        return `${value.toFixed(1)}%`;
      case 'request_count':
        return value.toString();
      case 'token_usage':
        return value.toString();
      default:
        return value.toString();
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="xs" shadow="md" style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
          <Text fw={500}>{label}</Text>
          
          {metric === 'token_usage' ? (
            <>
              <Text size="sm">Input: {payload[0].value}</Text>
              <Text size="sm">Output: {payload[1].value}</Text>
              <Text size="sm" fw={500}>Total: {payload[0].value + payload[1].value}</Text>
            </>
          ) : (
            <Text size="sm">{getMetricLabel()}: {formatValue(payload[0].value)}</Text>
          )}
        </Paper>
      );
    }
    
    return null;
  };
  
  // Handle loading state
  if (isLoading) {
    return (
      <Box>
        <Stack spacing="md">
          <Group position="apart">
            <Group>
              <ThemeIcon color="blue" variant="light">
                {getMetricIcon()}
              </ThemeIcon>
              <Title order={4}>{title || `${getMetricLabel()} Over Time`}</Title>
            </Group>
          </Group>
          <Skeleton height={height} radius="md" />
        </Stack>
      </Box>
    );
  }
  
  // Handle error state
  if (isError || !data) {
    return (
      <Box>
        <Stack spacing="md">
          <Group position="apart">
            <Group>
              <ThemeIcon color="red" variant="light">
                {getMetricIcon()}
              </ThemeIcon>
              <Title order={4}>{title || `${getMetricLabel()} Over Time`}</Title>
            </Group>
          </Group>
          <Paper p="md" withBorder style={{ height: height }}>
            <Text align="center" color="dimmed" my="xl">
              Failed to load metric data
            </Text>
          </Paper>
        </Stack>
      </Box>
    );
  }
  
  // Handle no data state
  if (chartData.length === 0) {
    return (
      <Box>
        <Stack spacing="md">
          <Group position="apart">
            <Group>
              <ThemeIcon color="blue" variant="light">
                {getMetricIcon()}
              </ThemeIcon>
              <Title order={4}>{title || `${getMetricLabel()} Over Time`}</Title>
            </Group>
          </Group>
          <Paper p="md" withBorder style={{ height: height }}>
            <Text align="center" color="dimmed" my="xl">
              No data available for this period
            </Text>
          </Paper>
        </Stack>
      </Box>
    );
  }
  
  return (
    <Box>
      <Stack spacing="md">
        <Group position="apart">
          <Group>
            <ThemeIcon color="blue" variant="light">
              {getMetricIcon()}
            </ThemeIcon>
            <Title order={4}>{title || `${getMetricLabel()} Over Time`}</Title>
          </Group>
          
          <Text size="sm" color="dimmed">
            {period.charAt(0).toUpperCase() + period.slice(1)} view
          </Text>
        </Group>
        
        <Paper p="md" withBorder>
          <ResponsiveContainer width="100%" height={height}>
            {metric === 'token_usage' ? (
              // Bar chart for token usage
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="input" name="Input Tokens" fill={theme.colors.blue[6]} />
                <Bar dataKey="output" name="Output Tokens" fill={theme.colors.green[6]} />
              </BarChart>
            ) : (
              // Line chart for other metrics
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getMetricColor()}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={getMetricLabel()}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Paper>
      </Stack>
    </Box>
  );
};

export default PerformanceChart;