import React from 'react';
import { ActionIcon, Button, Tooltip } from '@mantine/core';
import { IconLock, IconLockPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import DeadlockModal from '../../DeadlockDisplay/DeadlockModal';

// Define the types for props
interface DeadlockColumnProps {
  event: {
    id: string;
    message?: string;
    tags?: Array<{ key: string; value: string }>;
    exception?: {
      values?: Array<{
        value?: string;
        type?: string;
      }>;
    };
    [key: string]: any;
  };
}

/**
 * Deadlock column component for event table
 * Displays a button to open deadlock analyzer modal for PostgreSQL deadlock events
 */
const DeadlockColumn: React.FC<DeadlockColumnProps> = ({ event }) => {
  const [opened, { open, close }] = useDisclosure(false);
  
  // Check if this is a deadlock event
  const isDeadlockEvent = React.useMemo(() => {
    if (!event) return false;
    
    // Check for deadlock keywords in message or 40P01 error code
    const message = event.message || '';
    const hasDeadlockMessage = message.toLowerCase().includes('deadlock detected');
    
    // Check tags for error code
    const tags = event.tags || [];
    const hasDeadlockCode = tags.some(tag => 
      (tag.key === 'error_code' || tag.key === 'db_error_code' || tag.key === 'sql_state') && 
      tag.value === '40P01'
    );
    
    // Check exception values
    const exception = event.exception?.values?.[0] || {};
    const hasDeadlockException = 
      (exception.value?.toLowerCase()?.includes('deadlock detected')) || 
      (exception.type?.toLowerCase()?.includes('deadlock'));
    
    return hasDeadlockMessage || hasDeadlockCode || hasDeadlockException;
  }, [event]);
  
  if (!isDeadlockEvent) {
    return (
      <Tooltip label="Not a PostgreSQL deadlock">
        <ActionIcon size="sm" variant="subtle" color="gray" disabled>
          <IconLock size={14} />
        </ActionIcon>
      </Tooltip>
    );
  }
  
  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="blue"
        leftSection={<IconLockPlus size={14} />}
        onClick={open}
      >
        Analyze Deadlock
      </Button>
      
      {opened && (
        <DeadlockModal
          eventId={event.id}
          eventDetails={event}
          isOpen={opened}
          onClose={close}
        />
      )}
    </>
  );
};

export default DeadlockColumn;
