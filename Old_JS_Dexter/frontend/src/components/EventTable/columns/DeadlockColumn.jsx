// frontend/src/components/EventTable/columns/DeadlockColumn.jsx

import React, { useState } from 'react';
import { 
  Button, 
  Tooltip, 
  Badge, 
  ThemeIcon, 
  useMantineTheme,
  Group
} from '@mantine/core';
import { IconGraph, IconAlertCircle } from '@tabler/icons-react';
import DeadlockModal from '../../DeadlockDisplay/DeadlockModal';
import { useAuditLog } from '../../../hooks/useAuditLog';

/**
 * Column component for Deadlock detection and analysis
 * This component renders a button to open the deadlock modal for events
 * that contain PostgreSQL deadlock errors.
 */
function DeadlockColumn({ event }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const theme = useMantineTheme();
  const logEvent = useAuditLog('DeadlockColumn');
  
  // Detect if this is a deadlock event
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
  
  // If not a deadlock event, show nothing or minimal UI
  if (!isDeadlockEvent) {
    return null;
  }
  
  return (
    <>
      <Tooltip label="Analyze PostgreSQL Deadlock">
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconGraph size={14} />}
          onClick={() => {
            setIsModalOpen(true);
            logEvent('open_deadlock_modal_from_table', { eventId: event.id });
          }}
          color="indigo"
        >
          Analyze Deadlock
        </Button>
      </Tooltip>
      
      <DeadlockModal
        eventId={event.id}
        eventDetails={event}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          logEvent('close_deadlock_modal_from_table', { eventId: event.id });
        }}
      />
    </>
  );
}

export default DeadlockColumn;