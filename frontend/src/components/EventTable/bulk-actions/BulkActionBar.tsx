// File: src/components/EventTable/bulk-actions/BulkActionBar.tsx

import React, { useState } from 'react';
import { 
  Paper, 
  Group, 
  Badge, 
  Text, 
  Button, 
  Select, 
  Menu, 
  Transition, 
  Box 
} from '@mantine/core';
import { 
  IconTag, 
  IconUser, 
  IconBrandGithub, 
  IconX, 
  IconCheck, 
  IconDotsVertical 
} from '@tabler/icons-react';
import { showSuccessNotification, showErrorNotification } from '../../../utils/errorHandling';
import { SentryEvent } from '../../../types/deadlock';
import { EventType } from '../../../types/eventTypes';

interface BulkActionBarProps {
  selectedEvents: string[] | EventType[];
  eventData?: Record<string, SentryEvent | EventType>;
  onSelectStatus?: (status: string) => void;
  onAssign?: (userId: string) => void;
  onAddTags?: (tags: string[]) => void;
  onCreateIssue?: () => void;
  onClearSelection?: () => void;
  isUpdating?: boolean;
  visible?: boolean;
}

/**
 * Bulk action bar for performing operations on multiple selected events
 */
const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedEvents,
  eventData,
  onSelectStatus,
  onAssign,
  onAddTags,
  onCreateIssue,
  onClearSelection,
  isUpdating = false,
  visible = true
}) => {
  const [status, setStatus] = useState<string>('');
  
  // Get total impact from selected events
  const calculateTotalImpact = (): number => {
    // If selectedEvents is an array of EventType objects
    if (selectedEvents.length > 0 && typeof selectedEvents[0] === 'object') {
      const events = selectedEvents as EventType[];
      const userCount = events.reduce((total, event) => {
        // Add count property or default to 1
        return total + (event.count || 1);
      }, 0);
      return userCount;
    }
    
    // If selectedEvents is an array of IDs and we have eventData
    if (!eventData) return 0;
    
    // Count unique users from selected events
    const userIds = new Set<string>();
    
    (selectedEvents as string[]).forEach(eventId => {
      const event = eventData[eventId];
      if (event && (event as any).user?.id) {
        userIds.add((event as any).user.id);
      }
    });
    
    return userIds.size;
  };
  
  // Handle status change
  const handleStatusChange = (value: string | null) => {
    if (!value) return;
    
    setStatus(value);
    
    if (onSelectStatus) {
      onSelectStatus(value);
    }
  };
  
  // Handle apply button click
  const handleApply = () => {
    if (!status) {
      showErrorNotification({
        title: 'Status Required',
        message: 'Please select a status to apply'
      });
      return;
    }
    
    if (onSelectStatus) {
      onSelectStatus(status);
    }
    
    showSuccessNotification({
      title: 'Status Updated',
      message: `Applied status ${status} to ${selectedEvents.length} events`
    });
  };
  
  // Show or hide based on visibility prop
  if (!visible || selectedEvents.length === 0) {
    return null;
  }
  
  return (
    <Transition mounted={visible && selectedEvents.length > 0} transition="slide-up">
      {(styles) => (
        <Box style={styles}>
          <Paper 
            p="sm" 
            shadow="md" 
            mb="md"
            style={{
              position: 'sticky',
              bottom: '16px',
              zIndex: 10
            }}
          >
          <Group justify="space-between">
            <Group>
              <Badge size="lg">{selectedEvents.length} selected</Badge>
              <Text size="sm">
                Impact: {calculateTotalImpact()} {typeof selectedEvents[0] === 'object' ? 'events' : 'users'}
              </Text>
            </Group>
            
            <Group>
              <Select
                placeholder="Set status"
                data={[
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'unresolved', label: 'Unresolved' },
                  { value: 'ignored', label: 'Ignored' },
                ]}
                value={status}
                onChange={handleStatusChange}
                w={140}
                size="xs"
              />
              
              <Button 
                onClick={handleApply}
                loading={isUpdating}
                disabled={!status}
                size="xs"
                leftSection={status ? <IconCheck size={12} /> : null}
              >
                Apply
              </Button>
              
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="light" size="xs" rightSection={<IconDotsVertical size={12} />}>
                    More Actions
                  </Button>
                </Menu.Target>
                
                <Menu.Dropdown>
                  <Menu.Item 
                    leftSection={<IconTag size={14} />}
                    onClick={() => onAddTags && onAddTags([])}
                  >
                    Add tags
                  </Menu.Item>
                  
                  <Menu.Item 
                    leftSection={<IconUser size={14} />}
                    onClick={() => onAssign && onAssign('')}
                  >
                    Assign to...
                  </Menu.Item>
                  
                  <Menu.Item 
                    leftSection={<IconBrandGithub size={14} />}
                    onClick={() => onCreateIssue && onCreateIssue()}
                  >
                    Create GitHub issue
                  </Menu.Item>
                  
                  <Menu.Divider />
                  
                  <Menu.Item 
                    leftSection={<IconX size={14} />}
                    onClick={() => onClearSelection && onClearSelection()}
                    color="red"
                  >
                    Clear selection
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
          </Paper>
        </Box>
      )}
    </Transition>
  );
};

export default BulkActionBar;
