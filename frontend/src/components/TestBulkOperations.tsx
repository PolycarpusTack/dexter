// Test component for bulk operations functionality
import React, { useState } from 'react';
import { 
  Paper, 
  Stack, 
  Text, 
  Button, 
  Group, 
  Code, 
  TextInput,
  Select,
  Checkbox,
  Badge,
  Divider,
  Title
} from '@mantine/core';
import { useBulkOperations } from '../hooks/useBulkOperations';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';

const TEST_ISSUES = [
  { id: 'issue1', title: 'Test Issue 1' },
  { id: 'issue2', title: 'Test Issue 2' },
  { id: 'issue3', title: 'Test Issue 3' },
  { id: 'issue4', title: 'Test Issue 4' },
];

const TestBulkOperations: React.FC = () => {
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  const { 
    performBulkOperations, 
    bulkUpdateStatus, 
    bulkAssign, 
    bulkAddTags,
    isProcessing, 
    progress 
  } = useBulkOperations();

  const handleSelectAll = () => {
    if (selectedIssues.length === TEST_ISSUES.length) {
      setSelectedIssues([]);
    } else {
      setSelectedIssues(TEST_ISSUES.map(issue => issue.id));
    }
  };

  const handleBulkStatus = async () => {
    if (!status || selectedIssues.length === 0) {
      showErrorNotification({
        title: 'Missing Information',
        message: 'Please select issues and status'
      });
      return;
    }

    try {
      const result = await bulkUpdateStatus(selectedIssues, status);
      setResult(result);
      showSuccessNotification({
        title: 'Success',
        message: `Updated status for ${result.succeeded} issues`
      });
    } catch (error) {
      showErrorNotification({
        title: 'Error',
        message: (error as Error).message
      });
    }
  };

  const handleBulkAssign = async () => {
    if (!assignee || selectedIssues.length === 0) {
      showErrorNotification({
        title: 'Missing Information',
        message: 'Please select issues and assignee'
      });
      return;
    }

    try {
      const result = await bulkAssign(selectedIssues, assignee);
      setResult(result);
      showSuccessNotification({
        title: 'Success',
        message: `Assigned ${result.succeeded} issues`
      });
    } catch (error) {
      showErrorNotification({
        title: 'Error',
        message: (error as Error).message
      });
    }
  };

  const handleBulkTags = async () => {
    if (!tags || selectedIssues.length === 0) {
      showErrorNotification({
        title: 'Missing Information',
        message: 'Please select issues and tags'
      });
      return;
    }

    const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    
    try {
      const result = await bulkAddTags(selectedIssues, tagArray);
      setResult(result);
      showSuccessNotification({
        title: 'Success',
        message: `Tagged ${result.succeeded} issues`
      });
    } catch (error) {
      showErrorNotification({
        title: 'Error',
        message: (error as Error).message
      });
    }
  };

  const handleMixedOperations = async () => {
    const operations = selectedIssues.map((issueId, index) => {
      // Mix different operation types
      if (index % 3 === 0) {
        return {
          issue_id: issueId,
          operation_type: 'status' as const,
          data: { status: 'resolved' }
        };
      } else if (index % 3 === 1) {
        return {
          issue_id: issueId,
          operation_type: 'assign' as const,
          data: { assignee: 'test@example.com' }
        };
      } else {
        return {
          issue_id: issueId,
          operation_type: 'tag' as const,
          data: { tags: ['test', 'bulk'] }
        };
      }
    });

    try {
      const result = await performBulkOperations(operations);
      setResult(result);
      showSuccessNotification({
        title: 'Success',
        message: `Processed ${result.succeeded} operations`
      });
    } catch (error) {
      showErrorNotification({
        title: 'Error',
        message: (error as Error).message
      });
    }
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Title order={2}>Test Bulk Operations</Title>
        
        {/* Issue Selection */}
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Select Issues</Text>
            <Button size="xs" variant="subtle" onClick={handleSelectAll}>
              {selectedIssues.length === TEST_ISSUES.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Group>
          
          {TEST_ISSUES.map(issue => (
            <Checkbox
              key={issue.id}
              label={issue.title}
              checked={selectedIssues.includes(issue.id)}
              onChange={(e) => {
                if (e.currentTarget.checked) {
                  setSelectedIssues(prev => [...prev, issue.id]);
                } else {
                  setSelectedIssues(prev => prev.filter(id => id !== issue.id));
                }
              }}
            />
          ))}
          
          {selectedIssues.length > 0 && (
            <Badge size="lg" variant="filled">
              {selectedIssues.length} selected
            </Badge>
          )}
        </Stack>
        
        <Divider />
        
        {/* Bulk Status Update */}
        <Stack>
          <Text fw={600}>Bulk Status Update</Text>
          <Group>
            <Select
              placeholder="Select status"
              data={[
                { value: 'resolved', label: 'Resolved' },
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'ignored', label: 'Ignored' },
              ]}
              value={status}
              onChange={(value) => setStatus(value || '')}
              style={{ flex: 1 }}
            />
            <Button 
              onClick={handleBulkStatus} 
              loading={isProcessing}
              disabled={selectedIssues.length === 0 || !status}
            >
              Update Status
            </Button>
          </Group>
        </Stack>
        
        <Divider />
        
        {/* Bulk Assignment */}
        <Stack>
          <Text fw={600}>Bulk Assignment</Text>
          <Group>
            <TextInput
              placeholder="Enter assignee email"
              value={assignee}
              onChange={(e) => setAssignee(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button 
              onClick={handleBulkAssign} 
              loading={isProcessing}
              disabled={selectedIssues.length === 0 || !assignee}
            >
              Assign
            </Button>
          </Group>
        </Stack>
        
        <Divider />
        
        {/* Bulk Tagging */}
        <Stack>
          <Text fw={600}>Bulk Tagging</Text>
          <Group>
            <TextInput
              placeholder="Enter tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button 
              onClick={handleBulkTags} 
              loading={isProcessing}
              disabled={selectedIssues.length === 0 || !tags}
            >
              Add Tags
            </Button>
          </Group>
        </Stack>
        
        <Divider />
        
        {/* Mixed Operations Test */}
        <Stack>
          <Text fw={600}>Mixed Operations Test</Text>
          <Text size="sm" color="dimmed">
            This will apply different operations to selected issues
          </Text>
          <Button 
            onClick={handleMixedOperations} 
            loading={isProcessing}
            disabled={selectedIssues.length === 0}
            variant="filled"
          >
            Run Mixed Operations
          </Button>
        </Stack>
        
        {/* Progress Display */}
        {isProcessing && (
          <Paper p="sm" withBorder bg="blue.0">
            <Group>
              <Text fw={600}>Processing:</Text>
              <Text>
                {progress.processed} / {progress.total} completed
              </Text>
              <Text color="green">
                {progress.succeeded} succeeded
              </Text>
              <Text color="red">
                {progress.failed} failed
              </Text>
            </Group>
          </Paper>
        )}
        
        {/* Result Display */}
        {result && (
          <Stack gap="sm">
            <Text fw={600}>Result:</Text>
            <Code block>{JSON.stringify(result, null, 2)}</Code>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default TestBulkOperations;
