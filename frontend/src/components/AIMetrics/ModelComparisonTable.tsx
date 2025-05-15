import React, { useState } from 'react';
import { Table, Paper, Title, Text, Group, MultiSelect, Loader, Button, Badge } from '@mantine/core';
import { useModelComparison } from '../../api/unified/hooks/useMetrics';
import { formatNumber, formatDuration, formatPercentage } from '../../utils/numberFormatters';

interface ModelComparisonTableProps {
  availableModels: Array<{ value: string; label: string }>;
  title?: string;
}

const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  availableModels,
  title = 'Model Comparison'
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const { data, isLoading, error, refetch } = useModelComparison(
    selectedModels,
    { enabled: selectedModels.length > 0 }
  );

  const handleModelSelectionChange = (modelIds: string[]) => {
    setSelectedModels(modelIds);
  };

  const renderMetricValue = (metric: string, value: any) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (metric) {
      case 'response_time':
        return formatDuration(value);
      case 'success_rate':
        return formatPercentage(value);
      case 'request_count':
        return formatNumber(value);
      case 'token_usage':
        return formatNumber(value);
      case 'estimated_cost':
        return `$${formatNumber(value, 4)}`;
      default:
        return value.toString();
    }
  };

  const getStatusBadge = (availability: boolean) => {
    return availability ? 
      <Badge color="green">Available</Badge> : 
      <Badge color="red">Unavailable</Badge>;
  };

  if (error) {
    return (
      <Paper p="md" withBorder>
        <Title order={3}>{title}</Title>
        <Text color="red">Error loading model comparison data: {error.message}</Text>
        <Button onClick={() => refetch()} mt="sm">
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Group position="apart" mb="md">
        <Title order={3}>{title}</Title>
        <MultiSelect
          data={availableModels}
          value={selectedModels}
          onChange={handleModelSelectionChange}
          placeholder="Select models to compare"
          label="Compare Models"
          clearable
          searchable
          maxDropdownHeight={200}
          style={{ minWidth: 250 }}
        />
      </Group>

      {selectedModels.length === 0 ? (
        <Text color="dimmed">Please select at least one model to compare</Text>
      ) : isLoading ? (
        <Group position="center" p="xl">
          <Loader />
          <Text>Loading comparison data...</Text>
        </Group>
      ) : data && data.models ? (
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Metric</th>
              {data.models.map((model: any) => (
                <th key={model.id}>{model.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Provider</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{model.provider}</td>
              ))}
            </tr>
            <tr>
              <td>Status</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{getStatusBadge(model.available)}</td>
              ))}
            </tr>
            <tr>
              <td>Avg Response Time</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{renderMetricValue('response_time', model.metrics.response_time)}</td>
              ))}
            </tr>
            <tr>
              <td>Success Rate</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{renderMetricValue('success_rate', model.metrics.success_rate)}</td>
              ))}
            </tr>
            <tr>
              <td>Total Requests</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{renderMetricValue('request_count', model.metrics.request_count)}</td>
              ))}
            </tr>
            <tr>
              <td>Token Usage</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{renderMetricValue('token_usage', model.metrics.token_usage)}</td>
              ))}
            </tr>
            <tr>
              <td>Estimated Cost</td>
              {data.models.map((model: any) => (
                <td key={model.id}>{renderMetricValue('estimated_cost', model.metrics.estimated_cost)}</td>
              ))}
            </tr>
          </tbody>
        </Table>
      ) : (
        <Text>No comparison data available</Text>
      )}
    </Paper>
  );
};

export default ModelComparisonTable;