// File: frontend/src/components/EventTable/columns/SparklineCell.jsx

import React from 'react';
import { Box, Skeleton, Tooltip, Text, Group } from '@mantine/core';
import useEventFrequency from '../../../hooks/useEventFrequency';
import SparklineChart from '../../Visualization/SparklineChart';

/**
 * SparklineCell component for displaying event frequency in table
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.eventData - Event data with issueId
 * @param {string} props.timeRange - Time range displayed (default: '24h')
 */
function SparklineCell({ eventData, timeRange = '24h' }) {
  const { data, isLoading, error } = useEventFrequency(eventData.id, timeRange);
  
  if (error) {
    return (
      <Box w={120} h={40} style={{ display: 'flex', alignItems: 'center' }}>
        <Text size="xs" color="red">Error loading data</Text>
      </Box>
    );
  }
  
  const tooltipLabel = isLoading 
    ? 'Loading event frequency data...'
    : !data
      ? 'No event frequency data available'
      : `Event frequency over ${timeRange === '24h' ? 'last 24 hours' : timeRange === '7d' ? 'last 7 days' : 'last 30 days'}`;
  
  return (
    <Tooltip label={tooltipLabel} withinPortal>
      <Box w={120} h={40}>
        {isLoading ? (
          <Skeleton width={120} height={40} />
        ) : !data ? (
          <Group align="center" h={40}>
            <Text size="xs" color="dimmed">No data</Text>
          </Group>
        ) : (
          <SparklineChart
            data={data.data || []}
            timeRange={timeRange}
            width={120}
            height={40}
            showTrend={true}
            isLoading={isLoading}
          />
        )}
      </Box>
    </Tooltip>
  );
}

export default SparklineCell;
