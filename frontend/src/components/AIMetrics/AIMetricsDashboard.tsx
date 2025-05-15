import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Select, Title, Tabs, Group, Box } from '@mantine/core';
import { useModelRegistry } from '../../api/unified/hooks/useAi';
import PerformanceChart from './PerformanceChart';
import ModelComparisonTable from './ModelComparisonTable';

const AIMetricsDashboard: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [metricType, setMetricType] = useState<string>('response_time');
  const [timePeriod, setTimePeriod] = useState<string>('day');
  const { data: modelRegistry, isLoading } = useModelRegistry();
  
  const metricOptions = [
    { value: 'response_time', label: 'Response Time' },
    { value: 'success_rate', label: 'Success Rate' },
    { value: 'request_count', label: 'Request Count' },
    { value: 'token_usage', label: 'Token Usage' }
  ];
  
  const timeOptions = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'all', label: 'All Time' }
  ];

  // Transform model registry data to format expected by MultiSelect
  const getAvailableModels = () => {
    if (!modelRegistry || !modelRegistry.models) return [];
    
    return modelRegistry.models.map((model: any) => ({
      value: model.id,
      label: `${model.name} (${model.provider})`
    }));
  };

  // Set initial selected model when data loads
  useEffect(() => {
    if (modelRegistry && modelRegistry.models && modelRegistry.models.length > 0 && !selectedModel) {
      setSelectedModel(modelRegistry.models[0].id);
    }
  }, [modelRegistry, selectedModel]);

  return (
    <Container size="xl" px="md">
      <Title order={2} mb="lg">AI Performance Metrics</Title>
      
      <Tabs defaultValue="charts">
        <Tabs.List mb="md">
          <Tabs.Tab value="charts">Performance Charts</Tabs.Tab>
          <Tabs.Tab value="comparison">Model Comparison</Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="charts">
          <Paper p="md" withBorder mb="lg">
            <Group position="apart" mb="md">
              <Title order={3}>Performance Metrics</Title>
              <Group>
                <Select
                  label="Select Model"
                  placeholder="Choose a model"
                  data={getAvailableModels()}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  style={{ minWidth: 200 }}
                  disabled={isLoading}
                />
                <Select
                  label="Metric"
                  placeholder="Choose metric"
                  data={metricOptions}
                  value={metricType}
                  onChange={(value) => setMetricType(value || 'response_time')}
                  style={{ minWidth: 150 }}
                />
                <Select
                  label="Time Period"
                  placeholder="Choose time period"
                  data={timeOptions}
                  value={timePeriod}
                  onChange={(value) => setTimePeriod(value || 'day')}
                  style={{ minWidth: 150 }}
                />
              </Group>
            </Group>
            
            {selectedModel && (
              <Box mt="md">
                <PerformanceChart
                  modelId={selectedModel}
                  metric={metricType as any}
                  period={timePeriod as any}
                  interval={timePeriod === 'hour' ? 'minute' : timePeriod === 'all' ? 'day' : 'hour'}
                  height={400}
                />
              </Box>
            )}
          </Paper>
          
          <Grid>
            <Grid.Col span={6}>
              <PerformanceChart
                modelId={selectedModel || ''}
                metric="success_rate"
                period="week"
                interval="day"
                title="Weekly Success Rate"
                height={300}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <PerformanceChart
                modelId={selectedModel || ''}
                metric="request_count"
                period="week" 
                interval="day"
                title="Weekly Usage"
                height={300}
              />
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
        
        <Tabs.Panel value="comparison">
          <ModelComparisonTable availableModels={getAvailableModels()} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default AIMetricsDashboard;