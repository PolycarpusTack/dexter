import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  Paper,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Loader,
  Stack,
  Button,
  Alert,
  TextInput,
  Select,
  Card,
  Grid,
  Modal,
  Progress,
  Center,
  Skeleton
} from '@mantine/core';
import {
  IconBrain,
  IconServer,
  IconDownload,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconSearch,
  IconFilter,
  IconDownloadOff,
  IconPlayerPlay
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { hooks } from '../../api/unified';
import { notifications } from '@mantine/notifications';

// Import hooks directly to avoid the destructuring error
import useAi from '../../api/unified/hooks/useAi';

interface ModelInfo {
  name: string;
  status: 'available' | 'unavailable' | 'downloading' | 'error';
  size?: number;
  modified_at?: string;
  details?: Record<string, any>;
  downloadProgress?: number;
}

interface UnifiedModelSelectorProps {
  compact?: boolean;
  onModelChange?: (modelName: string) => void;
  showStatus?: boolean;
}

export const UnifiedModelSelector: React.FC<UnifiedModelSelectorProps> = ({
  compact = false,
  onModelChange,
  showStatus = true
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hooks with proper error handling
  const { data: modelsData, isLoading, error, refetch } = useAi.useOllamaModels({
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pullModelMutation = useAi.usePullModel();
  const selectModelMutation = useAi.useSetActiveModel();

  // Filter and sort models
  const { availableModels, unavailableModels, downloadingModels, currentModel } = useMemo(() => {
    if (!modelsData?.models) {
      return {
        availableModels: [],
        unavailableModels: [],
        downloadingModels: [],
        currentModel: modelsData?.current_model || 'None'
      };
    }

    const models = modelsData.models;
    const filtered = models.filter(model => {
      // Apply search filter
      if (searchQuery && !model.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Apply status filter
      if (statusFilter !== 'all' && model.status !== statusFilter) {
        return false;
      }
      return true;
    });

    return {
      availableModels: filtered.filter(m => m.status === 'available'),
      unavailableModels: filtered.filter(m => m.status === 'unavailable'),
      downloadingModels: filtered.filter(m => m.status === 'downloading'),
      currentModel: modelsData.current_model || 'None'
    };
  }, [modelsData, searchQuery, statusFilter]);

  // Handle model selection
  const handleSelectModel = async (modelName: string) => {
    try {
      await selectModelMutation.mutateAsync(modelName);
      notifications.show({
        title: 'Model Selected',
        message: `Successfully switched to ${modelName}`,
        color: 'green',
        icon: <IconCheck />
      });
      
      if (onModelChange) {
        onModelChange(modelName);
      }
      
      // Refresh models list
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to select model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
        icon: <IconX />
      });
    }
  };

  // Handle model download
  const handleDownloadModel = async (modelName: string) => {
    try {
      await pullModelMutation.mutateAsync(modelName);
      notifications.show({
        title: 'Download Started',
        message: `Downloading ${modelName}...`,
        color: 'blue',
        icon: <IconDownload />
      });
      
      // Refresh models list periodically during download
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
      }, 5000);
      
      // Clean up interval after 5 minutes
      setTimeout(() => clearInterval(interval), 300000);
    } catch (error) {
      notifications.show({
        title: 'Download Failed',
        message: `Failed to download model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
        icon: <IconX />
      });
    }
  };

  // Get status color
  const getStatusColor = (status: ModelInfo['status']) => {
    switch (status) {
      case 'available':
        return 'green';
      case 'downloading':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ModelInfo['status']) => {
    switch (status) {
      case 'available':
        return <IconCheck size={16} />;
      case 'downloading':
        return <Loader size={16} />;
      case 'error':
        return <IconX size={16} />;
      default:
        return <IconAlertCircle size={16} />;
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  // Loading state
  if (isLoading && !modelsData) {
    return (
      <Stack>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </Stack>
    );
  }

  // Error state
  if (error && !modelsData) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error Loading Models">
        {error instanceof Error ? error.message : 'Failed to load models'}
        <Button size="xs" mt="xs" onClick={() => refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Compact view
  if (compact) {
    return (
      <Box>
        <Group justify="space-between" align="center">
          <Group>
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconBrain size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>Current Model</Text>
              <Text size="xs" c="dimmed">{currentModel}</Text>
            </div>
          </Group>
          <Button
            size="xs"
            variant="light"
            onClick={() => setIsModalOpen(true)}
            leftSection={<IconBrain size={14} />}
          >
            Change Model
          </Button>
        </Group>

        <Modal
          opened={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Select AI Model"
          size="lg"
        >
          {/* Full selector view in modal */}
          <UnifiedModelSelector compact={false} onModelChange={onModelChange} />
        </Modal>
      </Box>
    );
  }

  // Full view
  return (
    <Stack gap="md">
      {showStatus && (
        <Paper p="md" withBorder>
          <Group justify="space-between" align="center">
            <Group>
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconBrain size={20} />
              </ThemeIcon>
              <div>
                <Text fw={500}>Current Model</Text>
                <Text size="sm" c="dimmed">{currentModel}</Text>
              </div>
            </Group>
            <Badge
              color={modelsData?.ollama_status === 'available' ? 'green' : 'red'}
              variant="light"
              leftSection={modelsData?.ollama_status === 'available' ? <IconCheck size={12} /> : <IconX size={12} />}
            >
              Ollama {modelsData?.ollama_status === 'available' ? 'Connected' : 'Offline'}
            </Badge>
          </Group>
        </Paper>
      )}

      {/* Search and filters */}
      <Group>
        <TextInput
          flex={1}
          placeholder="Search models..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Select
          w={180}
          placeholder="Filter by status"
          leftSection={<IconFilter size={16} />}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value || 'all')}
          data={[
            { value: 'all', label: 'All Models' },
            { value: 'available', label: 'Available' },
            { value: 'unavailable', label: 'Not Downloaded' },
            { value: 'downloading', label: 'Downloading' }
          ]}
        />
      </Group>

      {/* Available Models */}
      {availableModels.length > 0 && (
        <Stack gap="xs">
          <Text fw={500} size="sm">Available Models</Text>
          <Grid>
            {availableModels.map((model) => (
              <Grid.Col key={model.name} span={{ base: 12, sm: 6, md: 4 }}>
                <Card withBorder p="sm">
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500} size="sm">{model.name}</Text>
                        <Text size="xs" c="dimmed">{formatSize(model.size)}</Text>
                      </div>
                      <Badge
                        color={getStatusColor(model.status)}
                        variant="light"
                        leftSection={getStatusIcon(model.status)}
                      >
                        {model.status}
                      </Badge>
                    </Group>
                    
                    <Group gap="xs">
                      {model.name === currentModel ? (
                        <Button
                          size="xs"
                          variant="filled"
                          color="green"
                          leftSection={<IconCheck size={14} />}
                          disabled
                          fullWidth
                        >
                          Current Model
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlayerPlay size={14} />}
                          onClick={() => handleSelectModel(model.name)}
                          loading={selectModelMutation.isPending}
                          fullWidth
                        >
                          Use This Model
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      )}

      {/* Downloading Models */}
      {downloadingModels.length > 0 && (
        <Stack gap="xs">
          <Text fw={500} size="sm">Downloading</Text>
          <Grid>
            {downloadingModels.map((model) => (
              <Grid.Col key={model.name} span={{ base: 12, sm: 6, md: 4 }}>
                <Card withBorder p="sm">
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500} size="sm">{model.name}</Text>
                        <Text size="xs" c="dimmed">Downloading...</Text>
                      </div>
                      <Loader size="sm" />
                    </Group>
                    
                    {model.downloadProgress && (
                      <Progress
                        value={model.downloadProgress}
                        size="sm"
                        animate
                      />
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      )}

      {/* Unavailable Models */}
      {unavailableModels.length > 0 && (
        <Stack gap="xs">
          <Text fw={500} size="sm">Available for Download</Text>
          <Grid>
            {unavailableModels.map((model) => (
              <Grid.Col key={model.name} span={{ base: 12, sm: 6, md: 4 }}>
                <Card withBorder p="sm">
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500} size="sm">{model.name}</Text>
                        <Text size="xs" c="dimmed">{formatSize(model.size)}</Text>
                      </div>
                      <Badge
                        color={getStatusColor(model.status)}
                        variant="light"
                        leftSection={getStatusIcon(model.status)}
                      >
                        Not Downloaded
                      </Badge>
                    </Group>
                    
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconDownload size={14} />}
                      onClick={() => handleDownloadModel(model.name)}
                      loading={pullModelMutation.isPending}
                      fullWidth
                    >
                      Download
                    </Button>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      )}
      
      {/* Empty state */}
      {modelsData?.models?.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconAlertCircle size={48} style={{ opacity: 0.5 }} />
            <Text c="dimmed">No models found</Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );
};