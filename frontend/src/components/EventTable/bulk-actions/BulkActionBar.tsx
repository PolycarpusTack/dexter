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

interface BulkActionBarProps {
  selectedEvents: string[];
  eventData?: Record<string, SentryEvent>;
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
    if (!eventData) return 0;
    
    // Count unique users from selected events
    const userIds = new Set<string>();
    
    selectedEvents.forEach(eventId => {
      const event = eventData[eventId];
      if (event && event.user?.id) {
        userIds.add(event.user.id);
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
        <Paper 
          style={styles} 
          p="sm" 
          shadow="md" 
          mb="md"
          sx={(theme) => ({
            position: 'sticky',
            bottom: theme.spacing.md,
            zIndex: 10
          })}
        >
          <Group position="apart">
            <Group>
              <Badge size="lg">{selectedEvents.length} selected</Badge>
              <Text size="sm">
                Impact: {calculateTotalImpact()} users
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
              >
                Apply
              </Button>
              
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="light" size="xs">
                    More Actions
                  </Button>
                </Menu.Target>
                
                <Menu.Dropdown>
                  <Menu.Item 
                    icon={<IconTag size={14} />}
                    onClick={() => onAddTags && onAddTags([])}
                  >
                    Add tags
                  </Menu.Item>
                  
                  <Menu.Item 
                    icon={<IconUser size={14} />}
                    onClick={() => onAssign && onAssign('')}
                  >
                    Assign to...
                  </Menu.Item>
                  
                  <Menu.Item 
                    icon={<IconBrandGithub size={14} />}
                    onClick={() => onCreateIssue && onCreateIssue()}
                  >
                    Create GitHub issue
                  </Menu.Item>
                  
                  <Menu.Divider />
                  
                  <Menu.Item 
                    icon={<IconX size={14} />}
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
      )}
    </Transition>
  );
};

export default BulkActionBar;
