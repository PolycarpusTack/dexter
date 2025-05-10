// File: src/components/EventTable/columns/DeadlockColumn.tsx

import React from 'react';
import { 
  Badge, 
  Button, 
  Tooltip, 
  Group, 
  Text, 
  Box, 
  ActionIcon, 
  ThemeIcon,
  useMantineTheme
} from '@mantine/core';
import { 
  IconDatabase, 
  IconLock, 
  IconExternalLink, 
  IconAlertTriangle 
} from '@tabler/icons-react';
import { hasDeadlock } from '../../../api/deadlockApi';
import { EventType } from '../../../types/eventTypes';

interface DeadlockColumnProps {
  event: EventType;
  onViewDeadlock?: (eventId: string) => void;
  showIndicator?: boolean;
  showButton?: boolean;
}

/**
 * DeadlockColumn component for displaying deadlock detection in event tables
 */
const DeadlockColumn: React.FC<DeadlockColumnProps> = ({
  event,
  onViewDeadlock,
  showIndicator = true,
  showButton = true
}) => {
  const theme = useMantineTheme();
  
  // Check if this is a deadlock event
  const isDeadlockEvent = hasDeadlock(event);
  
  // Get severity from event data (aiSummary may be an object with deadlockAnalysis)
  let severity = 0;
  if (event.aiSummary && typeof event.aiSummary === 'object' && event.aiSummary !== null && 'deadlockAnalysis' in event.aiSummary) {
    const deadlockAnalysis = (event.aiSummary as any).deadlockAnalysis;
    if (deadlockAnalysis && typeof deadlockAnalysis === 'object' && 'severity' in deadlockAnalysis) {
      severity = deadlockAnalysis.severity || 0;
    }
  }
  const severityColor = severity > 70 ? 'red' : severity > 40 ? 'orange' : 'yellow';
  
  // If not a deadlock, just show a dash or nothing
  if (!isDeadlockEvent) {
    return showIndicator ? (
      <Box>
        <Text color="dimmed" inline>—</Text>
      </Box>
    ) : null;
  }
  
  // Handle view deadlock click
  const handleViewDeadlock = () => {
    if (onViewDeadlock) {
      onViewDeadlock(event.id);
    }
  };
  
  return (
    <Group gap={8} wrap="nowrap">
      {/* Deadlock indicator badge */}
      {showIndicator && (
        <Tooltip
          label="PostgreSQL Deadlock (40P01)"
          position="top"
          withArrow
        >
          <Badge 
            color={severityColor} 
            variant="filled" 
            leftSection={
              <Box style={{ display: 'flex', alignItems: 'center' }}>
                <ThemeIcon size="xs" color={severityColor} variant="transparent" style={{ backgroundColor: 'transparent' }}>
                  {severity > 70 ? <IconAlertTriangle size={10} style={{ color: theme.colors[severityColor][9] }} /> : <IconLock size={10} style={{ color: theme.colors[severityColor][9] }} />}
                </ThemeIcon>
              </Box>
            }
            size="sm"
          >
            Deadlock
          </Badge>
        </Tooltip>
      )}
      
      {/* View button */}
      {showButton && (
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={handleViewDeadlock}
          leftSection={<IconDatabase size={12} />}
        >
          Analyze
        </Button>
      )}
      
      {/* Alternative compact view */}
      {!showButton && !showIndicator && (
        <Tooltip
          label="View PostgreSQL Deadlock Analysis"
          position="top"
          withArrow
        >
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={handleViewDeadlock}
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
};

export default DeadlockColumn;
