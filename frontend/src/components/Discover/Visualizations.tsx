import React, { useState, useMemo } from 'react';
import {
  Box,
  Select,
  Paper,
  Group,
  Text,
  Stack,
  Button,
  SimpleGrid,
  ColorInput,
  Switch,
  Menu,
  ActionIcon,
  Card,
} from '@mantine/core';
import {
  IconChartBar,
  IconChartLine,
  IconChartArea,
  IconChartPie,
  IconTable,
  IconDownload,
  IconSettings,
  IconCalculator,
  IconStack,
  IconTarget,
  IconBrush,
  IconActivity,
  IconGraph,
  IconChartBubble,
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DiscoverQueryResponse } from '../../utils/api';

// Types
interface VisualizationProps {
  data: DiscoverQueryResponse;
  query: any;
}

type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'table';

interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
}

// Default colors for charts
const CHART_COLORS = [
  '#339af0',
  '#51cf66',
  '#fab005',
  '#ff6b6b',
  '#845ef7',
  '#20c997',
  '#fd7e14',
  '#e64980',
  '#0ca678',
  '#74c0fc',
];

// Component
const Visualizations: React.FC<VisualizationProps> = ({ data, query: _query }) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    showGrid: true,
    showLegend: true,
    color: CHART_COLORS[0],
  });

  // Get available fields for axes
  const fields = useMemo(() => {
    if (!data?.meta?.fields) return [];
    return Object.entries(data.meta.fields).map(([field, type]) => ({
      value: field,
      label: field,
      type,
    }));
  }, [data]);

  // Get numeric fields for Y axis
  const numericFields = useMemo(() => {
    return fields.filter(
      (field) =>
        field.type === 'integer' ||
        field.type === 'number' ||
        field.type === 'float' ||
        field.type === 'duration'
    );
  }, [fields]);

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!data?.data || !chartConfig.xAxis || !chartConfig.yAxis) return [];

    // Group data if groupBy is specified
    if (chartConfig.groupBy) {
      const grouped: Record<string, any[]> = {};
      data.data.forEach((row: any) => {
        const key = row[chartConfig.groupBy!];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });

      // Aggregate grouped data
      return Object.entries(grouped).map(([group, rows]) => {
        const aggregated: any = {
          [chartConfig.groupBy!]: group,
        };

        // Sum numeric values
        numericFields.forEach((field) => {
          const sum = rows.reduce((acc, row) => acc + (row[field.value] || 0), 0);
          aggregated[field.value] = sum;
        });

        return aggregated;
      });
    }

    return data.data;
  }, [data, chartConfig, numericFields]);

  // Render chart based on type
  const renderChart = () => {
    if (!chartConfig.xAxis || !chartConfig.yAxis) {
      return (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed">Please select X and Y axes to visualize data</Text>
        </Box>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartConfig.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey={chartConfig.yAxis}
                stroke={chartConfig.color}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
              <Bar dataKey={chartConfig.yAxis} fill={chartConfig.color} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
              <Area
                type="monotone"
                dataKey={chartConfig.yAxis}
                stroke={chartConfig.color}
                fill={chartConfig.color}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = chartData.map((item: any) => ({
          name: chartConfig.xAxis ? item[chartConfig.xAxis] : undefined,
          value: chartConfig.yAxis ? item[chartConfig.yAxis] : undefined,
        })).filter(item => item.name !== undefined && item.value !== undefined);

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {pieData.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Export chart as image
  const exportChart = () => {
    // TODO: Implement chart export functionality using html2canvas or dom-to-image
    console.log('Export chart functionality to be implemented');
  };

  return (
    <Box>
      <Stack gap="md">
        {/* Chart Type Selector */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <Group>
              <Stack gap="xs">
                <Text size="sm" fw={500}>Chart Type</Text>
                <Group>
                  <ActionIcon 
                    variant={chartConfig.type === 'bar' ? 'filled' : 'subtle'}
                    color="blue"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: 'bar' }))}
                    title="Bar Chart"
                  >
                    <IconChartBar size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant={chartConfig.type === 'line' ? 'filled' : 'subtle'}
                    color="blue"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: 'line' }))}
                    title="Line Chart"
                  >
                    <IconChartLine size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant={chartConfig.type === 'area' ? 'filled' : 'subtle'}
                    color="blue"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: 'area' }))}
                    title="Area Chart"
                  >
                    <IconChartArea size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant={chartConfig.type === 'pie' ? 'filled' : 'subtle'}
                    color="blue"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: 'pie' }))}
                    title="Pie Chart"
                  >
                    <IconChartPie size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant={chartConfig.type === 'table' ? 'filled' : 'subtle'}
                    color="blue"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: 'table' }))}
                    title="Table View"
                  >
                    <IconTable size={18} />
                  </ActionIcon>
                </Group>
              </Stack>
              <Select
                label="X Axis"
                placeholder="Select field"
                value={chartConfig.xAxis}
                onChange={(value) =>
                  setChartConfig((prev) => ({ ...prev, xAxis: value || undefined }))
                }
                data={fields}
              />
              <Select
                label="Y Axis"
                placeholder="Select field"
                value={chartConfig.yAxis}
                onChange={(value) =>
                  setChartConfig((prev) => ({ ...prev, yAxis: value || undefined }))
                }
                data={numericFields}
              />
              <Select
                label="Group By"
                placeholder="Optional"
                value={chartConfig.groupBy}
                onChange={(value) =>
                  setChartConfig((prev) => ({ ...prev, groupBy: value || undefined }))
                }
                data={fields}
                clearable
              />
            </Group>
            <Group>
              <Menu position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="default">
                    <IconSettings size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Stack gap="xs" p="sm">
                    <Switch
                      label="Show Grid"
                      checked={chartConfig.showGrid}
                      onChange={(e) =>
                        setChartConfig((prev) => ({
                          ...prev,
                          showGrid: e.currentTarget.checked,
                        }))
                      }
                    />
                    <Switch
                      label="Show Legend"
                      checked={chartConfig.showLegend}
                      onChange={(e) =>
                        setChartConfig((prev) => ({
                          ...prev,
                          showLegend: e.currentTarget.checked,
                        }))
                      }
                    />
                    <ColorInput
                      label="Chart Color"
                      value={chartConfig.color}
                      onChange={(value) =>
                        setChartConfig((prev) => ({ ...prev, color: value }))
                      }
                      format="hex"
                      withPicker={false}
                    />
                  </Stack>
                </Menu.Dropdown>
              </Menu>
              <Button
                leftSection={<IconDownload size={16} />}
                variant="default"
                onClick={exportChart}
              >
                Export
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Chart Display */}
        <Paper p="md" withBorder>
          {data?.data?.length ? (
            renderChart()
          ) : (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="dimmed">No data available for visualization</Text>
            </Box>
          )}
        </Paper>

        {/* Chart Info */}
        {chartData.length > 0 && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Showing {chartData.length} data points
                </Text>
                <Text size="sm" c="dimmed">
                  {data.executedAt ? 
                    `Last updated: ${new Date(data.executedAt).toLocaleString()}` : 
                    'Last updated: Not available'
                  }
                </Text>
              </Group>
              
              {/* Advanced Visualization Options */}
              <SimpleGrid cols={4}>
                <Card withBorder p="xs">
                  <Group>
                    <IconCalculator size={18} />
                    <Text size="sm">Analytics</Text>
                  </Group>
                </Card>
                <Card withBorder p="xs">
                  <Group>
                    <IconStack size={18} />
                    <Text size="sm">Data Layers</Text>
                  </Group>
                </Card>
                <Card withBorder p="xs">
                  <Group>
                    <IconTarget size={18} />
                    <Text size="sm">Anomalies</Text>
                  </Group>
                </Card>
                <Card withBorder p="xs">
                  <Group>
                    <IconBrush size={18} />
                    <Text size="sm">Themes</Text>
                  </Group>
                </Card>
              </SimpleGrid>
              
              <Group justify="center">
                <Button variant="subtle" leftSection={<IconActivity size={16} />}>
                  View Trends
                </Button>
                <Button variant="subtle" leftSection={<IconGraph size={16} />}>
                  Compare Metrics
                </Button>
                <Button variant="subtle" leftSection={<IconChartBubble size={16} />}>
                  Advanced Analysis
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default Visualizations;
