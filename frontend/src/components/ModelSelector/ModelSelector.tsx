// File: frontend/src/components/ModelSelector/ModelSelector.tsx

import React, { useState, useEffect, ReactNode } from 'react';
import {
  Box,
  Text,
  Paper,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  Select,
  ThemeIcon,
  Loader,
  Stack,
  Button,
  Alert,
  useMantineTheme
} from '@mantine/core';
import {
  IconBrain,
  IconServer,
  IconDownload,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconChevronDown
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchModelsList, pullModel, setActiveModel } from '../../api/modelApi';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import useAppStore from '../../store/appStore';

// Define interfaces for props and data types
interface ModelSelectorProps {
  onModelChange?: (modelName: string) => void;
}

interface ModelData {
  name: string;
  status: 'available' | 'unavailable' | 'downloading' | 'error';
  size?: number;
  details?: any;
  error?: string;
}

interface ModelsData {
  models: ModelData[];
  current_model?: string;
  ollama_status: 'available' | 'error';
  error?: string;
}

interface StatusInfo {
  color: string;
  icon: ReactNode;
  label: string;
}

interface PullModelResponse {
  status: string;
  message: string;
  name: string;
  estimated_time?: string;
}

interface SelectModelResponse {
  status: string;
  model: string;
  message: string;
}

interface ModelSelectOption {
  value: string;
  label: string;
}

/**
 * Component to display available Ollama models with status indicators
 * and allow selection of which model to use for explanations.
 */
const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Get from app store
  const { activeAIModel, setActiveAIModel } = useAppStore(state => ({
    activeAIModel: state.activeAIModel,
    setActiveAIModel: state.setActiveAIModel
  }));
  
  // Fetch available models
  const { 
    data: modelsData, 
    isLoading: isLoadingModels,
    isError: isModelsError,
    refetch: refetchModels
  } = useQuery<ModelsData>({
    queryKey: ['ollamaModels'],
    queryFn: fetchModelsList,
    refetchInterval: 30000, // Refresh every 30 seconds to update download status
    retry: 2,
    staleTime: 15000 // Consider stale after 15 seconds
  });
  
  // Handle initial model info syncing with backend
  useEffect(() => {
    if (modelsData?.current_model && !activeAIModel) {
      // Sync the backend's current model to our store if we don't have one set
      setActiveAIModel(modelsData.current_model);
    }
  }, [modelsData, activeAIModel, setActiveAIModel]);
  
  // Pull model mutation
  const pullModelMutation = useMutation<PullModelResponse, Error, string>({
    mutationFn: (modelName: string) => pullModel(modelName),
    onSuccess: (data) => {
      showSuccessNotification({
        title: 'Model Download Started',
        message: `Started downloading ${data.name || 'model'}. This may take several minutes to complete in the background.`,
        autoClose: 8000
      });
      
      // Show estimated download time if available
      if (data.estimated_time) {
        showSuccessNotification({
          title: 'Download Time Estimate',
          message: `Estimated download time: ${data.estimated_time} depending on your internet connection.`,
          autoClose: 8000
        });
      }
      
      // Show a helpful message about download size
      const modelSize = getEstimatedModelSize(data.name || '');
      if (modelSize) {
        showSuccessNotification({
          title: 'Download Information',
          message: `This model is approximately ${modelSize} in size. Please be patient while downloading.`,
          autoClose: 8000
        });
      }
      
      // Automatically refresh the model list after a delay 
      // to show the download status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
      }, 5000); // Check after 5 seconds
      
      // Also set up periodic checks for download status
      const checkInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
      }, 30000); // Check every 30 seconds
      
      // Clear interval after 30 minutes (assuming any download would finish by then)
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 30 * 60 * 1000);
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Model Download Failed',
        error
      });
    }
  });
  
  // Get estimated model size for information display
  const getEstimatedModelSize = (modelName: string): string | null => {
    // Rough estimates based on model type
    if (modelName.includes('mistral')) return '4-7 GB';
    if (modelName.includes('llama3')) return '4-8 GB';
    if (modelName.includes('phi3')) return '3-5 GB';
    if (modelName.includes('gemma')) return '4-8 GB'; 
    if (modelName.includes('mixtral')) return '10-15 GB';
    if (modelName.includes('codellama')) return '7-10 GB';
    return null; // Unknown size
  };
  
  // Select model mutation
  const selectModelMutation = useMutation<SelectModelResponse, Error, string>({
    mutationFn: (modelName: string) => setActiveModel(modelName),
    onSuccess: (data) => {
      showSuccessNotification({
        title: 'Model Changed',
        message: `Active model set to ${data.model}`
      });
      
      // Update our local store
      setActiveAIModel(data.model);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
      
      // Call the optional callback
      if (onModelChange) {
        onModelChange(data.model);
      }
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to Change Model',
        error
      });
    }
  });
  
  // Handler for model selection
  const handleModelSelect = (modelName: string | null): void => {
    if (modelName) {
      selectModelMutation.mutate(modelName);
    }
  };
  
  // Handler for model download
  const handlePullModel = (modelName: string): void => {
    pullModelMutation.mutate(modelName);
  };
  
  // Get traffic light status indicator for Ollama
  const getOllamaStatus = (): StatusInfo => {
    if (isLoadingModels) return { color: 'yellow', icon: <Loader size="xs" />, label: 'Checking' };
    if (isModelsError || !modelsData) return { color: 'red', icon: <IconX size={12} />, label: 'Offline' };
    if (modelsData?.ollama_status === 'error') return { color: 'red', icon: <IconX size={12} />, label: 'Error' };
    return { color: 'green', icon: <IconCheck size={12} />, label: 'Online' };
  };
  
  // Get model status indicator
  const getModelStatus = (model?: ModelData | null): StatusInfo => {
    if (!model) return { color: 'gray', icon: <IconAlertCircle size={12} />, label: 'Unknown' };
    
    switch (model.status) {
      case 'available':
        return { color: 'green', icon: <IconCheck size={12} />, label: 'Available' };
      case 'unavailable':
        return { color: 'red', icon: <IconX size={12} />, label: 'Not Installed' };
      case 'downloading':
        return { color: 'blue', icon: <Loader size="xs" />, label: 'Downloading' };
      case 'error':
        return { color: 'orange', icon: <IconAlertCircle size={12} />, label: 'Error' };
      default:
        return { color: 'gray', icon: <IconAlertCircle size={12} />, label: 'Unknown' };
    }
  };
  
  // Format model size for display
  const formatSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const GB = 1024 * 1024 * 1024;
    const MB = 1024 * 1024;
    if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
    return `${(bytes / MB).toFixed(1)} MB`;
  };
  
  // Get model processing time estimate (rough guidelines)
  const getModelProcessingTime = (model?: ModelData): string => {
    if (!model?.name) return 'Unknown';
    
    // These are rough estimates - actual times will vary by hardware
    const estimates: Record<string, string> = {
      'mistral': 'Fast (5-20s)',
      'mistral:latest': 'Fast (5-20s)',
      'gemma': 'Medium (15-40s)',
      'gemma:latest': 'Medium (15-40s)',
      'llama3': 'Medium (20-60s)',
      'llama3:latest': 'Medium (20-60s)',
      'phi3': 'Fast (5-30s)',
      'phi3:latest': 'Fast (5-30s)',
      'codellama': 'Slow (30-120s)',
      'mixtral': 'Very slow (60-300s)',
      'mixtral:latest': 'Very slow (60-300s)'
    };
    
    // Check for exact match
    if (estimates[model.name]) {
      return estimates[model.name];
    }
    
    // Check for partial match
    for (const [key, value] of Object.entries(estimates)) {
      if (model.name.includes(key)) {
        return value;
      }
    }
    
    // Default estimate
    return estimates[model.name] || 'Unknown';
  };
  
  const ollamaStatus = getOllamaStatus();
  
  // Determine current model from either store or API response
  const currentModelName = activeAIModel || modelsData?.current_model || 'Unknown';
  
  // Find current model's status
  const currentModel = modelsData?.models.find(m => m.name === currentModelName);
  const currentModelStatus = getModelStatus(currentModel);
  
  // Generate model select options
  const modelOptions: ModelSelectOption[] = modelsData?.models
    .filter(model => model.status === 'available')
    .map(model => ({
      value: model.name,
      label: model.name
    })) || [];
  
  if (isLoadingModels) {
    return (
      <Paper p="xs" withBorder>
        <Group justify="apart">
          <Group>
            <ThemeIcon color="blue" size="sm" radius="xl">
              <IconBrain size={14} />
            </ThemeIcon>
            <Text size="sm" fw={500}>AI Model</Text>
          </Group>
          <Loader size="xs" />
        </Group>
      </Paper>
    );
  }
  
  // Compact view when not expanded
  if (!isExpanded) {
    return (
      <Paper 
        p="sm" 
        withBorder 
        onClick={() => setIsExpanded(true)}
        styles={{
          root: {
            cursor: 'pointer',
            '&:hover': { backgroundColor: theme.colors.gray[0] }
          }
        }}
      >
        <Group justify="apart">
          <Group gap="xs">
            <ThemeIcon color="indigo" size="sm" radius="xl">
              <IconBrain size={14} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500}>AI Model</Text>
              <Text size="xs" color="dimmed">
                {currentModelName}
              </Text>
            </Box>
          </Group>
          
          <Group gap="xs">
            <Badge 
              size="sm"
              color={ollamaStatus.color}
              variant="outline"
              leftSection={
                <Box styles={{ root: { display: 'flex', alignItems: 'center' } }}>
                  {ollamaStatus.icon}
                </Box>
              }
            >
              Ollama: {ollamaStatus.label}
            </Badge>
            
            <Badge 
              size="sm"
              color={currentModelStatus.color}
              variant="outline"
              leftSection={
                <Box styles={{ root: { display: 'flex', alignItems: 'center' } }}>
                  {currentModelStatus.icon}
                </Box>
              }
            >
              {currentModelStatus.label}
            </Badge>
            
            <ActionIcon size="sm">
              <IconChevronDown size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>
    );
  }
  
  // Expanded view with model selection
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="apart">
          <Group>
            <ThemeIcon color="indigo" size="md" radius="md">
              <IconBrain size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={500}>AI Model Settings</Text>
              <Text size="xs" color="dimmed">
                Select which Ollama model to use for error explanations
              </Text>
            </Box>
          </Group>
          
          <Button 
            variant="subtle" 
            size="xs" 
            onClick={() => setIsExpanded(false)}
          >
            Collapse
          </Button>
        </Group>
        
        {/* Status Section */}
        <Group justify="apart">
          <Group>
            <Badge 
              size="lg"
              color={ollamaStatus.color}
              variant="light"
              leftSection={
                <Box styles={{ root: { display: 'flex', alignItems: 'center' } }}>
                  {ollamaStatus.icon}
                </Box>
              }
            >
              Ollama: {ollamaStatus.label}
            </Badge>
            
            <Badge 
              size="lg"
              color={currentModelStatus.color}
              variant="light"
              leftSection={
                <Box styles={{ root: { display: 'flex', alignItems: 'center' } }}>
                  {currentModelStatus.icon}
                </Box>
              }
            >
              Current Model: {currentModelStatus.label}
            </Badge>
          </Group>
          
          <Button 
            variant="light" 
            size="xs"
            leftSection={<IconServer size={14} />}
            onClick={() => refetchModels()}
          >
            Check Status
          </Button>
        </Group>
        
        {isModelsError && (
          <Alert color="red" title="Connection Error">
            Cannot connect to Ollama. Make sure Ollama is running on your machine.
          </Alert>
        )}
        
        {/* Model Selector */}
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Text fw={500} size="sm">Current Model: {currentModelName}</Text>
            
            <Select
              label="Choose Explanation Model"
              placeholder="Select a model"
              data={modelOptions}
              value={currentModelName}
              onChange={handleModelSelect}
              searchable
              disabled={modelOptions.length === 0 || selectModelMutation.isPending}
              styles={{ root: { maxWidth: '400px' } }}
            />
            
            <Alert color="blue" variant="light">
              <Text size="xs">
                For slower computers, we recommend using smaller models like "mistral:latest" or "phi3:latest" for 
                faster response times. Larger models provide better explanations but require more processing power.
              </Text>
            </Alert>
            
            <Text size="xs" color="dimmed">Only showing available models. Pull models first if not listed.</Text>
          </Stack>
        </Paper>
        
        {/* Available Models List */}
        <Box>
          <Text fw={500} size="sm" mb="xs">Available Models</Text>
          <Stack gap="xs">
            {modelsData?.models.map(model => {
              const status = getModelStatus(model);
              return (
                <Paper key={model.name} withBorder p="xs">
                  <Group justify="apart">
                    <Group gap="xs">
                      <ThemeIcon color={status.color} size="sm" radius="xl" variant="light">
                        {status.icon}
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={500}>{model.name}</Text>
                        <Group gap={4}>
                          {model.size && (
                            <Text size="xs" color="dimmed">
                              Size: {formatSize(model.size)}
                            </Text>
                          )}
                          <Text size="xs" color="dimmed">•</Text>
                          <Text size="xs" color="dimmed">
                            Speed: {getModelProcessingTime(model)}
                          </Text>
                        </Group>
                      </Box>
                      {model.name === currentModelName && (
                        <Badge size="xs" variant="outline" color="green">Active</Badge>
                      )}
                    </Group>
                    
                    <Group gap="xs">
                      {model.status === 'available' ? (
                        <Button
                          size="xs"
                          variant="light"
                          disabled={model.name === currentModelName || selectModelMutation.isPending}
                          onClick={() => handleModelSelect(model.name)}
                        >
                          Use This Model
                        </Button>
                      ) : (
                        <Tooltip label="Download this model">
                          <ActionIcon
                            color="blue"
                            loading={pullModelMutation.isPending && pullModelMutation.variables === model.name}
                            onClick={() => handlePullModel(model.name)}
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default ModelSelector;