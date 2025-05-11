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
  NumberInput,
  Menu,
  ActionIcon,
} from '@mantine/core';
import {
  IconChartBar,
  IconChartLine,
  IconChartArea,
  IconChartPie,
  IconTable,
  IconDownload,
  IconSettings,
  IconDots,
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

// Types
interface VisualizationProps {
  data: any;
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
const Visualizations: React.FC<VisualizationProps> = ({ data, query }) => {
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
          <Text color="dimmed">Please select X and Y axes to visualize data</Text>
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
        const pieData = chartData.map((item) => ({
          name: item[chartConfig.xAxis],
          value: item[chartConfig.yAxis],
        }));

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
                {pieData.map((entry, index) => (
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
    // Implementation would use a library like html2canvas or dom-to-image
    console.log('Export chart functionality to be implemented');
  };

  return (
    <Box>
      <Stack spacing="md">
        {/* Chart Type Selector */}
        <Paper p="md" withBorder>
          <Group position="apart">
            <Group>
              <Select
                label="Chart Type"
                value={chartConfig.type}
                onChange={(value) =>
                  setChartConfig((prev) => ({ ...prev, type: value as ChartType }))
                }
                data={[
                  { value: 'bar', label: 'Bar Chart' },
                  { value: 'line', label: 'Line Chart' },
                  { value: 'area', label: 'Area Chart' },
                  { value: 'pie', label: 'Pie Chart' },
                ]}
                icon={<IconChartBar size={16} />}
              />
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
                  <Stack spacing="xs" p="sm">
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
                leftIcon={<IconDownload size={16} />}
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
              <Text color="dimmed">No data available for visualization</Text>
            </Box>
          )}
        </Paper>

        {/* Chart Info */}
        {chartData.length > 0 && (
          <Paper p="md" withBorder>
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Showing {chartData.length} data points
              </Text>
              <Text size="sm" color="dimmed">
                Last updated: {new Date(data.executedAt).toLocaleString()}
              </Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default Visualizations;
