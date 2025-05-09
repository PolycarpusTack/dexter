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
import { SentryEvent } from '../../../types/deadlock';

interface DeadlockColumnProps {
  event: SentryEvent;
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
  
  // If not a deadlock, just show a dash or nothing
  if (!isDeadlockEvent) {
    return showIndicator ? (
      <Text color="dimmed">—</Text>
    ) : null;
  }
  
  // Handle view deadlock click
  const handleViewDeadlock = () => {
    if (onViewDeadlock) {
      onViewDeadlock(event.id);
    }
  };
  
  return (
    <Group spacing={8} noWrap>
      {/* Deadlock indicator badge */}
      {showIndicator && (
        <Tooltip
          label="PostgreSQL Deadlock (40P01)"
          position="top"
          withArrow
        >
          <Badge 
            color="red" 
            variant="filled" 
            leftSection={
              <Box style={{ display: 'flex' }}>
                <IconLock size={10} />
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
