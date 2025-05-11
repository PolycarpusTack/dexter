// Test component for issue assignment functionality
import React, { useState } from 'react';
import { Button, TextInput, Paper, Group, Stack, Text, Code } from '@mantine/core';
import { assignIssue } from '../api/issuesApi';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';

const TestAssignIssue: React.FC = () => {
  const [issueId, setIssueId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAssign = async () => {
    if (!issueId || !assigneeId) {
      showErrorNotification({
        title: 'Missing Information',
        message: 'Please provide both Issue ID and Assignee ID'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await assignIssue(issueId, assigneeId);
      setResult(response);
      showSuccessNotification({
        title: 'Success',
        message: `Issue ${issueId} has been assigned to ${assigneeId}`
      });
    } catch (error) {
      console.error('Assignment failed:', error);
      showErrorNotification({
        title: 'Assignment Failed',
        message: (error as Error).message || 'An error occurred while assigning the issue'
      });
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack spacing="md">
        <Text size="lg" weight={600}>Test Issue Assignment</Text>
        
        <TextInput
          label="Issue ID"
          placeholder="Enter issue ID"
          value={issueId}
          onChange={(e) => setIssueId(e.currentTarget.value)}
        />
        
        <TextInput
          label="Assignee ID or Email"
          placeholder="Enter assignee ID or email"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.currentTarget.value)}
        />
        
        <Group>
          <Button 
            onClick={handleAssign} 
            loading={loading}
            disabled={!issueId || !assigneeId}
          >
            Assign Issue
          </Button>
        </Group>
        
        {result && (
          <Stack spacing="sm">
            <Text weight={600}>Result:</Text>
            <Code block>{JSON.stringify(result, null, 2)}</Code>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default TestAssignIssue;
