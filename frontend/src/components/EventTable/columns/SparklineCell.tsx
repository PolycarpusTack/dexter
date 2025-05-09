// File: src/components/EventTable/columns/SparklineCell.tsx

import React from 'react';
import { 
  Box, 
  Text, 
  Group, 
  Tooltip, 
  Skeleton, 
  useMantineTheme
} from '@mantine/core';
import { 
  Sparkline, 
  Tooltip as SparklineTooltip, 
  LineSeries, 
  PointSeries 
} from '@mantine/sparkline';
import { IconArrowUpRight, IconArrowDownRight, IconArrowRight } from '@tabler/icons-react';
import { useEventFrequency } from '../../../hooks/useEventFrequency';
import { SentryEvent } from '../../../types/deadlock';

interface SparklineCellProps {
  event: SentryEvent;
  timeRange?: string;
  height?: number;
  width?: number;
  showTrend?: boolean;
}

/**
 * Sparkline cell for visualizing event frequency in tables
 */
const SparklineCell: React.FC<SparklineCellProps> = ({
  event,
  timeRange = '24h',
  height = 30,
  width = 120,
  showTrend = true
}) => {
  const theme = useMantineTheme();
  
  // Fetch event frequency data
  const { data, isLoading } = useEventFrequency(event.id, timeRange);
  
  // Extract data for sparkline
  const points = data?.points?.map(point => point.count) || [];
  const trend = data?.trend || 0;
  
  // If loading, show skeleton
  if (isLoading) {
    return <Skeleton width={width} height={height} radius="sm" />;
  }
  
  // If no data or all zeros, show empty message
  if (!points.length || points.every(p => p === 0)) {
    return (
      <Box w={width} h={height} style={{ display: 'flex', alignItems: 'center' }}>
        <Text size="xs" color="dimmed">No data available</Text>
      </Box>
    );
  }
  
  // Determine trend color
  const trendColor = trend > 0 ? theme.colors.red[6] 
    : trend < 0 ? theme.colors.green[6] 
    : theme.colors.gray[6];
  
  // Trend icon
  const TrendIcon = trend > 0 ? IconArrowUpRight 
    : trend < 0 ? IconArrowDownRight 
    : IconArrowRight;
  
  return (
    <Tooltip
      label={`${data.totalCount} total occurrences over ${timeRange}`}
      position="top"
      withArrow
    >
      <Box w={width}>
        <Sparkline
          h={height}
          data={points}
          curveType="linear"
          fillOpacity={0.2}
          strokeWidth={1.5}
          color={theme.colors.blue[6]}
        >
          <SparklineTooltip />
          <LineSeries />
          
          {/* Show spots on the line for emphasis */}
          {points.length < 24 && (
            <PointSeries size={2} />
          )}
        </Sparkline>
        
        {/* Show trend if enabled */}
        {showTrend && (
          <Group spacing={4} mt={2}>
            <TrendIcon size={12} color={trendColor} />
            <Text size="xs" c={trendColor}>
              {Math.abs(trend)}%
            </Text>
            
            {/* Peak indicator */}
            {data.peakCount > 0 && (
              <Text size="xs" c="dimmed" ml="auto">
                Peak: {data.peakCount}
              </Text>
            )}
          </Group>
        )}
      </Box>
    </Tooltip>
  );
};

export default SparklineCell;
