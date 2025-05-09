// File: frontend/src/components/EventTable/columns/ImpactCell.jsx

import React from 'react';
import { Box, Skeleton, Tooltip, Text, Progress, Group, ThemeIcon } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import useIssueImpact from '../../../hooks/useIssueImpact';

/**
 * ImpactCell component for displaying user impact in table
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.eventData - Event data with issueId
 * @param {string} props.timeRange - Time range displayed (default: '24h')
 */
function ImpactCell({ eventData, timeRange = '24h' }) {
  const { data, isLoading, error } = useIssueImpact(eventData.id, timeRange);
  
  // Function to determine color based on percentage
  const getImpactColor = (percentage) => {
    if (percentage >= 50) return 'red';
    if (percentage >= 20) return 'orange';
    if (percentage >= 5) return 'yellow';
    return 'green';
  };
  
  if (error) {
    return (
      <Box w={120} h={40} style={{ display: 'flex', alignItems: 'center' }}>
        <Text size="xs" color="red">Error loading data</Text>
      </Box>
    );
  }
  
  // Impact level label
  const getImpactLabel = (percentage) => {
    if (percentage >= 50) return 'Critical';
    if (percentage >= 20) return 'High';
    if (percentage >= 5) return 'Medium';
    return 'Low';
  };
  
  if (isLoading) {
    return <Skeleton width={120} height={40} />;
  }
  
  if (!data) {
    return (
      <Group align="center" h={40}>
        <Text size="xs" color="dimmed">No data</Text>
      </Group>
    );
  }
  
  const { affectedUsers, totalUsers, affectedPercentage } = data;
  const impactColor = getImpactColor(affectedPercentage);
  const impactLabel = getImpactLabel(affectedPercentage);
  
  const tooltipContent = (
    <Box p="xs">
      <Text size="sm" fw={500} mb="xs">User Impact</Text>
      <Text size="xs">
        {affectedUsers} of {totalUsers} users affected ({affectedPercentage}%)
      </Text>
      <Text size="xs">Impact Level: {impactLabel}</Text>
    </Box>
  );
  
  return (
    <Tooltip label={tooltipContent} withinPortal>
      <Box w={120}>
        <Group spacing={4} mb={2}>
          <ThemeIcon color={impactColor} size="xs" variant="light">
            <IconUsers size={10} />
          </ThemeIcon>
          <Text size="xs" fw={500}>
            {affectedUsers} users
          </Text>
        </Group>
        <Progress
          value={affectedPercentage}
          color={impactColor}
          size="sm"
          radius="xs"
        />
        <Text size="xs" c="dimmed" ta="right" mt={2}>
          {affectedPercentage}% of users
        </Text>
      </Box>
    </Tooltip>
  );
}

export default ImpactCell;