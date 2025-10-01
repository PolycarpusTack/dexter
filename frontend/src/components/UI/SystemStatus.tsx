import React, { useEffect, useState } from 'react';
import { Card, Group, Stack, Text, RingProgress, Title, Badge } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { fetchSystemHealth } from '@/api/unified/systemApi';

interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

export function SystemStatus() {
  const { data: healthData, isLoading, error } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchSystemHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getColorForStatus = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Card padding="md" radius="md" withBorder>
        <Title order={3}>System Status</Title>
        <Text>Loading system status...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" radius="md" withBorder>
        <Title order={3}>System Status</Title>
        <Text color="red">Error loading system status</Text>
      </Card>
    );
  }

  const { status, metrics } = healthData || { status: 'unknown', metrics: [] };

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack>
        <Group position="apart">
          <Title order={3}>System Status</Title>
          <Badge color={getColorForStatus(status)}>{status}</Badge>
        </Group>
        
        <Group grow>
          {metrics.map((metric: SystemMetric) => (
            <Card key={metric.name} padding="xs" radius="md" withBorder>
              <Stack spacing="xs" align="center">
                <Text weight={500}>{metric.name}</Text>
                <RingProgress
                  size={80}
                  thickness={8}
                  roundCaps
                  sections={[
                    { value: (metric.value / metric.max) * 100, color: getColorForStatus(metric.status) },
                  ]}
                  label={
                    <Text size="xs" align="center">
                      {metric.value} {metric.unit}
                    </Text>
                  }
                />
                <Text size="xs" color={getColorForStatus(metric.status)}>
                  {metric.status}
                </Text>
              </Stack>
            </Card>
          ))}
        </Group>
        
        <Text size="xs" color="dimmed">
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </Stack>
    </Card>
  );
}