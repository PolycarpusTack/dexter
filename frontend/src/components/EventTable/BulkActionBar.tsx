// File: src/components/EventTable/BulkActionBar.tsx

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
  Box,
  Modal,
  TextInput,
  Stack,
  MultiSelect,
  Loader,
  ActionIcon
} from '@mantine/core';
import { 
  IconTag, 
  IconUser, 
  IconBrandGithub, 
  IconX, 
  IconCheck, 
  IconDotsVertical,
  IconChevronRight 
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import { useBulkOperations } from '../../hooks/useBulkOperations';
import { EventType } from '../../types/eventTypes';

/**
 * Interface for bulk operations
 */
interface BulkOperation {
  issue_id: string;
  operation_type: 'status' | 'tag' | 'assign';
  data: Record<string, any>;
}

interface BulkActionBarProps {
  selectedEvents: EventType[];
  onClearSelection: () => void;
  visible?: boolean;
}

interface StatusOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'ignored', label: 'Ignored' },
];

const TAG_SUGGESTIONS = [
  'bug',
  'feature',
  'enhancement',
  'critical',
  'high-priority',
  'low-priority',
  'needs-triage',
  'customer-reported',
  'regression',
  'performance',
  'security',
  'ui',
  'api',
  'database',
];

/**
 * Enhanced bulk action bar for performing operations on multiple selected events
 */
const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedEvents,
  onClearSelection,
  visible = true
}) => {
  // State
  const [status, setStatus] = useState<string>('');
  const [assigneeModalOpened, { open: openAssigneeModal, close: closeAssigneeModal }] = useDisclosure(false);
  const [tagModalOpened, { open: openTagModal, close: closeTagModal }] = useDisclosure(false);
  const [assigneeEmail, setAssigneeEmail] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Use bulk operations hook
  const { 
    performBulkOperations, 
    isProcessing, 
    progress 
  } = useBulkOperations();
  
  // Calculate total impact from selected events
  const calculateTotalImpact = (): number => {
    return selectedEvents.reduce((total, event) => {
      return total + (event.count || 1);
    }, 0);
  };
  
  // Handle status change
  const handleStatusChange = async () => {
    if (!status) {
      showErrorNotification({
        title: 'Status Required',
        message: 'Please select a status to apply'
      });
      return;
    }
    
    const operations: BulkOperation[] = selectedEvents.map(event => ({
      issue_id: event.id,
      operation_type: 'status' as 'status' | 'tag' | 'assign',
      data: { status }
    }));
    
    try {
      const result = await performBulkOperations(operations);
      if (result.succeeded > 0) {
        showSuccessNotification({
          title: 'Status Updated',
          message: `Applied status "${status}" to ${result.succeeded} events`
        });
      }
      if (result.failed > 0) {
        showErrorNotification({
          title: 'Some operations failed',
          message: `Failed to update ${result.failed} events`
        });
      }
      onClearSelection();
      setStatus('');
    } catch (error) {
      showErrorNotification({
        title: 'Bulk Operation Failed',
        message: (error as Error).message
      });
    }
  };
  
  // Handle bulk assignment
  const handleAssign = async () => {
    if (!assigneeEmail.trim()) {
      showErrorNotification({
        title: 'Assignee Required',
        message: 'Please enter an assignee email or ID'
      });
      return;
    }
    
    const operations: BulkOperation[] = selectedEvents.map(event => ({
      issue_id: event.id,
      operation_type: 'assign' as 'status' | 'tag' | 'assign',
      data: { assignee: assigneeEmail.trim() }
    }));
    
    try {
      const result = await performBulkOperations(operations);
      if (result.succeeded > 0) {
        showSuccessNotification({
          title: 'Issues Assigned',
          message: `Assigned ${result.succeeded} events to ${assigneeEmail}`
        });
      }
      if (result.failed > 0) {
        showErrorNotification({
          title: 'Some operations failed',
          message: `Failed to assign ${result.failed} events`
        });
      }
      closeAssigneeModal();
      setAssigneeEmail('');
      onClearSelection();
    } catch (error) {
      showErrorNotification({
        title: 'Bulk Assignment Failed',
        message: (error as Error).message
      });
    }
  };
  
  // Handle bulk tagging
  const handleAddTags = async () => {
    if (selectedTags.length === 0) {
      showErrorNotification({
        title: 'Tags Required',
        message: 'Please select at least one tag to add'
      });
      return;
    }
    
    const operations: BulkOperation[] = selectedEvents.map(event => ({
      issue_id: event.id,
      operation_type: 'tag' as 'status' | 'tag' | 'assign',
      data: { tags: selectedTags }
    }));
    
    try {
      const result = await performBulkOperations(operations);
      if (result.succeeded > 0) {
        showSuccessNotification({
          title: 'Tags Added',
          message: `Added ${selectedTags.length} tags to ${result.succeeded} events`
        });
      }
      if (result.failed > 0) {
        showErrorNotification({
          title: 'Some operations failed',
          message: `Failed to tag ${result.failed} events`
        });
      }
      closeTagModal();
      setSelectedTags([]);
      onClearSelection();
    } catch (error) {
      showErrorNotification({
        title: 'Bulk Tagging Failed',
        message: (error as Error).message
      });
    }
  };
  
  // Handle create GitHub issue (placeholder)
  const handleCreateGitHubIssue = () => {
    showErrorNotification({
      title: 'Feature Coming Soon',
      message: 'GitHub issue creation is not yet implemented'
    });
  };
  
  // Show or hide based on visibility prop
  if (!visible || selectedEvents.length === 0) {
    return null;
  }
  
  return (
    <>
      <Transition mounted={visible && selectedEvents.length > 0} transition="slide-up">
        {(styles) => (
          <Box style={styles}>
            <Paper 
              p="sm" 
              shadow="md" 
              mb="md"
              style={{
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                minWidth: '600px'
              }}
            >
              <Group justify="space-between">
                <Group>
                  <Badge size="lg" variant="filled">
                    {selectedEvents.length} selected
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Impact: {calculateTotalImpact()} events
                  </Text>
                  {isProcessing && (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="xs" c="dimmed">
                        Processing... {progress.processed}/{progress.total}
                      </Text>
                    </Group>
                  )}
                </Group>
                
                <Group>
                  <Select
                    placeholder="Set status"
                    data={STATUS_OPTIONS}
                    value={status}
                    onChange={(value) => setStatus(value || '')}
                    w={140}
                    size="xs"
                  />
                  
                  <Button 
                    onClick={handleStatusChange}
                    loading={isProcessing}
                    disabled={!status}
                    size="xs"
                    leftSection={<IconCheck size={12} />}
                  >
                    Apply
                  </Button>
                  
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <Group gap={4}>
                        <Button 
                          variant="light" 
                          size="xs" 
                          rightSection={<IconChevronRight size={12} />}
                          loading={isProcessing}
                        >
                          More Actions
                        </Button>
                        <ActionIcon 
                          variant="subtle" 
                          size="sm"
                          disabled={isProcessing}
                        >
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Group>
                    </Menu.Target>
                    
                    <Menu.Dropdown>
                      <Menu.Item 
                        leftSection={<IconTag size={14} />}
                        onClick={openTagModal}
                      >
                        Add tags
                      </Menu.Item>
                      
                      <Menu.Item 
                        leftSection={<IconUser size={14} />}
                        onClick={openAssigneeModal}
                      >
                        Assign to...
                      </Menu.Item>
                      
                      <Menu.Item 
                        leftSection={<IconBrandGithub size={14} />}
                        onClick={handleCreateGitHubIssue}
                      >
                        Create GitHub issue
                      </Menu.Item>
                      
                      <Menu.Divider />
                      
                      <Menu.Item 
                        leftSection={<IconX size={14} />}
                        onClick={onClearSelection}
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
      
      {/* Assignee Modal */}
      <Modal
        opened={assigneeModalOpened}
        onClose={closeAssigneeModal}
        title="Assign Events"
        size="sm"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Assign {selectedEvents.length} selected events to:
          </Text>
          <TextInput
            placeholder="Enter assignee email or user ID"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.currentTarget.value)}
            leftSection={<IconUser size={16} />}
          />
          <Group justify="right">
            <Button variant="light" onClick={closeAssigneeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              loading={isProcessing}
              disabled={!assigneeEmail.trim()}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* Tags Modal */}
      <Modal
        opened={tagModalOpened}
        onClose={closeTagModal}
        title="Add Tags"
        size="sm"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Add tags to {selectedEvents.length} selected events:
          </Text>
          <MultiSelect
            placeholder="Select or enter tags"
            data={TAG_SUGGESTIONS}
            value={selectedTags}
            onChange={(value) => {
              setSelectedTags(value);
              // Handle new tag creation manually if needed
              const lastValue = value[value.length - 1];
              if (lastValue && !TAG_SUGGESTIONS.includes(lastValue)) {
                // This is a workaround since onCreate prop is not available
                console.log(`New tag created: ${lastValue}`);
              }
            }}
            searchable
            leftSection={<IconTag size={16} />}
            // Note: Using onChange instead of onCreate for tag creation
          />
          <Group justify="right">
            <Button variant="light" onClick={closeTagModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTags} 
              loading={isProcessing}
              disabled={selectedTags.length === 0}
            >
              Add Tags
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default BulkActionBar;
