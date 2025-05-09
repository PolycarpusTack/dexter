// File: src/components/EventTable/columns/ImpactCell.tsx

import React from 'react';
import { 
  Box, 
  Text, 
  Group, 
  Badge, 
  RingProgress, 
  Tooltip, 
  Skeleton,
  useMantineTheme
} from '@mantine/core';
import { 
  IconUsers, 
  IconAlertCircle, 
  IconAlertTriangle, 
  IconInfoCircle 
} from '@tabler/icons-react';
import { SentryEvent } from '../../../types/deadlock';
import { useIssueImpact } from '../../../hooks/useIssueImpact';

interface ImpactCellProps {
  event: SentryEvent;
  issueId?: string;
  timeRange?: string;
  showUsers?: boolean;
  showSessions?: boolean;
  showPercentage?: boolean;
}

/**
 * Impact cell for visualizing user impact in tables
 */
const ImpactCell: React.FC<ImpactCellProps> = ({
  event,
  issueId,
  timeRange = '7d',
  showUsers = true,
  showSessions = false,
  showPercentage = true
}) => {
  const theme = useMantineTheme();
  
  // Use the issueId passed in or fallback to event.id if it's part of a group
  const effectiveIssueId = issueId || (event.groupID ? event.groupID : event.id);
  
  // Fetch impact data
  const { data, isLoading } = useIssueImpact(effectiveIssueId, timeRange);
  
  // If loading, show skeleton
  if (isLoading) {
    return <Skeleton height={40} width={100} radius="sm" />;
  }
  
  // Determine impact level
  const getImpactLevel = () => {
    const percentage = data.userPercentage;
    
    if (percentage >= 5) return { level: 'High', color: 'red', icon: <IconAlertCircle size={12} /> };
    if (percentage >= 1) return { level: 'Medium', color: 'yellow', icon: <IconAlertTriangle size={12} /> };
    return { level: 'Low', color: 'blue', icon: <IconInfoCircle size={12} /> };
  };
  
  const impact = getImpactLevel();
  
  return (
    <Group position="left" noWrap>
      {/* Ring progress indicator */}
      <Tooltip
        label={`${data.userPercentage.toFixed(1)}% of users affected`}
        position="top"
        withArrow
      >
        <RingProgress
          size={40}
          thickness={3}
          roundCaps
          sections={[{ value: Math.min(100, data.userPercentage * 5), color: theme.colors[impact.color][6] }]}
          label={
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {impact.icon}
            </Box>
          }
        />
      </Tooltip>
      
      {/* Impact metrics */}
      <Box>
        {/* Impact level badge */}
        <Badge color={impact.color} size="sm" variant="light">
          {impact.level} Impact
        </Badge>
        
        {/* User count if enabled */}
        {showUsers && (
          <Group spacing={4} mt={4}>
            <IconUsers size={10} />
            <Text size="xs">
              {data.uniqueUsers} {data.uniqueUsers === 1 ? 'user' : 'users'}
              {showPercentage && ` (${data.userPercentage.toFixed(1)}%)`}
            </Text>
          </Group>
        )}
        
        {/* Session count if enabled */}
        {showSessions && (
          <Text size="xs" color="dimmed" mt={2}>
            {data.affectedSessions} sessions affected
          </Text>
        )}
      </Box>
    </Group>
  );
};

export default ImpactCell;
