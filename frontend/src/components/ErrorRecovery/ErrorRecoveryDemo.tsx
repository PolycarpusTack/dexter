import React from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack, 
  Badge,
  Alert,
  TextInput,
  Textarea,
  Code,
  Divider
} from '@mantine/core';
import { 
  IconDeviceFloppy, 
  IconRefresh, 
  IconTrash,
  IconHistory,
  IconAlertTriangle,
  IconBug,
  IconCheck
} from '@tabler/icons-react';
import { useErrorRecoveryState } from '../../hooks/useErrorRecoveryState';
import { stateRestoration } from '../../services/stateRestoration';

interface DemoFormData {
  title: string;
  description: string;
  tags: string[];
}

/**
 * Demo component showing error recovery features
 */
export function ErrorRecoveryDemo() {
  const {
    state,
    setState,
    error,
    isRecovering,
    hasUnsavedChanges,
    lastCheckpoint,
    save,
    restore,
    createCheckpoint,
    clearError,
    reset
  } = useErrorRecoveryState<DemoFormData>({
    key: 'demo_form',
    initialState: {
      title: '',
      description: '',
      tags: []
    },
    showNotifications: true
  });
  
  // Get all checkpoints
  const checkpoints = stateRestoration.listCheckpoints();
  
  // Simulate an error
  const triggerError = () => {
    try {
      // This will cause an error in setState
      setState(() => {
        throw new Error('Simulated error for demo');
      });
    } catch {
      // Error is handled by the hook
    }
  };
  
  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="md" radius="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Error Recovery Demo</Title>
            <Group gap="xs">
              {hasUnsavedChanges && (
                <Badge color="yellow" variant="dot">
                  Unsaved changes
                </Badge>
              )}
              {lastCheckpoint && (
                <Badge color="blue" variant="dot">
                  Checkpoint saved
                </Badge>
              )}
              {isRecovering && (
                <Badge color="orange" variant="dot">
                  Recovering...
                </Badge>
              )}
            </Group>
          </Group>
          
          <Text size="sm" c="dimmed">
            This demo shows automatic error recovery, auto-save, and state restoration features.
            Try editing the form, triggering errors, and using recovery options.
          </Text>
          
          {error && (
            <Alert 
              icon={<IconAlertTriangle size={16} />} 
              title="Error occurred" 
              color="red"
              withCloseButton
              onClose={clearError}
            >
              <Text size="sm">{error.message}</Text>
            </Alert>
          )}
          
          <Divider />
          
          {/* Demo Form */}
          <Stack gap="sm">
            <TextInput
              label="Title"
              placeholder="Enter a title"
              value={state.title}
              onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
            />
            
            <Textarea
              label="Description"
              placeholder="Enter a description"
              rows={4}
              value={state.description}
              onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
            />
            
            <TextInput
              label="Tags"
              placeholder="Enter tags (comma-separated)"
              value={state.tags.join(', ')}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              }))}
            />
          </Stack>
          
          <Divider />
          
          {/* Action Buttons */}
          <Stack gap="sm">
            <Text size="sm" fw={500}>Actions</Text>
            
            <Group>
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={save}
                disabled={!hasUnsavedChanges}
              >
                Save Now
              </Button>
              
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={restore}
                variant="light"
              >
                Restore
              </Button>
              
              <Button
                leftSection={<IconHistory size={16} />}
                onClick={createCheckpoint}
                variant="light"
              >
                Create Checkpoint
              </Button>
              
              <Button
                leftSection={<IconTrash size={16} />}
                onClick={reset}
                variant="light"
                color="red"
              >
                Reset
              </Button>
            </Group>
            
            <Group>
              <Button
                leftSection={<IconBug size={16} />}
                onClick={triggerError}
                variant="outline"
                color="orange"
              >
                Trigger Error
              </Button>
            </Group>
          </Stack>
          
          <Divider />
          
          {/* Current State */}
          <Stack gap="sm">
            <Text size="sm" fw={500}>Current State</Text>
            <Code block>
              {JSON.stringify(state, null, 2)}
            </Code>
          </Stack>
          
          {/* Checkpoints */}
          {checkpoints.length > 0 && (
            <>
              <Divider />
              <Stack gap="sm">
                <Text size="sm" fw={500}>Recovery Checkpoints</Text>
                {checkpoints.slice(0, 5).map((checkpoint) => (
                  <Group key={checkpoint.id} justify="space-between">
                    <div>
                      <Text size="xs" fw={500}>{checkpoint.route}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(checkpoint.timestamp).toLocaleString()}
                      </Text>
                    </div>
                    <Badge 
                      size="xs" 
                      variant="dot" 
                      color={checkpoint.id === lastCheckpoint ? 'green' : 'gray'}
                    >
                      {checkpoint.id === lastCheckpoint ? 'Current' : 'Available'}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
      
      <Alert icon={<IconCheck size={16} />} color="blue" variant="light">
        <Text size="sm" fw={500} mb="xs">Features Demonstrated:</Text>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Automatic saving with debouncing (2 seconds)</li>
          <li>State restoration on page reload</li>
          <li>Error recovery with automatic retry</li>
          <li>Manual checkpoint creation</li>
          <li>Warning on page leave with unsaved changes</li>
          <li>Visual indicators for state status</li>
        </ul>
      </Alert>
    </Stack>
  );
}