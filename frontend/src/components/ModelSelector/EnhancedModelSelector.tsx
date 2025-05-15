// frontend/src/components/ModelSelector/EnhancedModelSelector.tsx

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Text, 
  Group, 
  Stack, 
  Badge, 
  Button, 
  Avatar, 
  Select, 
  Loader, 
  Tabs,
  Accordion,
  Title,
  Card,
  Divider,
  ThemeIcon,
  Menu,
  SimpleGrid,
  Box, 
  useMantineTheme,
  Tooltip,
  Modal,
  List,
  Chip,
  ActionIcon
} from '@mantine/core';
import { 
  IconBrain, 
  IconDownload, 
  IconSettings, 
  IconChevronDown, 
  IconInfoCircle,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconCloudDownload,
  IconServer,
  IconArrowDown,
  IconPlus,
  IconChartLine,
  IconSort,
  IconCategory,
  IconLink,
  IconArrowsShuffle,
  IconCpu,
  IconRefresh,
  IconTerminal
} from '@tabler/icons-react';

// Import from unified API
import { api, hooks } from '../../api/unified';
import { 
  Model, 
  ModelCapability, 
  ModelSize, 
  ModelStatus, 
  ModelProvider,
  ModelGroup,
  FallbackChain
} from '../../api/unified/types';

// Hooks and Store
import useAppStore from '../../store/appStore';
import { notifications } from '@mantine/notifications';

const { useAi } = hooks;

interface ModelSelectorProps {
  onModelChange?: () => void;
  compact?: boolean;
  showAdvanced?: boolean;
}

/**
 * EnhancedModelSelector provides an interface for model selection with multi-provider support
 * and advanced features like fallback chains and model categories
 */
const EnhancedModelSelector: React.FC<ModelSelectorProps> = ({ 
  onModelChange,
  compact = false,
  showAdvanced = true
}) => {
  const theme = useMantineTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [createChainModalOpen, setCreateChainModalOpen] = useState<boolean>(false);
  const [fallbackChainModalOpen, setFallbackChainModalOpen] = useState<boolean>(false);
  const [selectedFallbackChain, setSelectedFallbackChain] = useState<string>('');
  const [newChainModels, setNewChainModels] = useState<string[]>([]);
  const [newChainName, setNewChainName] = useState<string>('');

  // Use the app store to manage active model
  const { activeAIModel, setActiveAIModel } = useAppStore();

  // Hooks for API calls
  const modelsQuery = useAi.useModelsEnhanced({ refetchInterval: 30000 });
  const pullModelMutation = useAi.usePullModelEnhanced();
  const selectModelMutation = useAi.useSelectModelEnhanced();
  const createFallbackChainMutation = useAi.useCreateFallbackChain();
  const setDefaultFallbackChainMutation = useAi.useSetDefaultFallbackChain();

  // Extract data from query results
  const models = modelsQuery.data?.models || [];
  const groups = modelsQuery.data?.groups || [];
  const fallbackChains = modelsQuery.data?.fallback_chains || [];
  const currentModel = modelsQuery.data?.current_model || activeAIModel;
  const currentFallbackChain = modelsQuery.data?.current_fallback_chain || '';
  const providers = modelsQuery.data?.providers || [];
  const providerStatus = modelsQuery.data?.status || {};

  // Filter models
  const filteredModels = models.filter(model => {
    // Filter by category
    if (selectedCategory !== 'all') {
      const categoryGroup = groups.find(g => g.name === selectedCategory);
      if (!categoryGroup || !categoryGroup.models.some(m => m.id === model.id)) {
        return false;
      }
    }

    // Filter by provider
    if (selectedProvider !== 'all' && model.provider !== selectedProvider) {
      return false;
    }

    // Filter by size
    if (selectedSize !== 'all' && model.size !== selectedSize) {
      return false;
    }

    return true;
  });

  // Sort models
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      const sizeOrder = { tiny: 0, small: 1, medium: 2, large: 3, xlarge: 4 };
      return (sizeOrder[a.size] || 0) - (sizeOrder[b.size] || 0);
    } else if (sortBy === 'status') {
      // Available models first, then downloading, then unavailable
      const statusOrder = { available: 0, downloading: 1, unavailable: 2, error: 3 };
      return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    } else if (sortBy === 'provider') {
      return a.provider.localeCompare(b.provider);
    }
    return 0;
  });

  // Group by status for simpler display
  const availableModels = sortedModels.filter(model => model.status === ModelStatus.AVAILABLE);
  const downloadingModels = sortedModels.filter(model => model.status === ModelStatus.DOWNLOADING);
  const unavailableModels = sortedModels.filter(
    model => model.status === ModelStatus.UNAVAILABLE || model.status === ModelStatus.ERROR
  );

  // Handle model selection
  const handleModelSelect = async (modelId: string) => {
    try {
      await selectModelMutation.mutateAsync({ model_id: modelId });
      setActiveAIModel(modelId);
      if (onModelChange) {
        onModelChange();
      }
      notifications.show({
        title: 'Model Changed',
        message: `Active model set to ${modelId}`,
        color: 'teal'
      });
    } catch (error) {
      notifications.show({
        title: 'Error Changing Model',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red'
      });
    }
  };

  // Handle model download
  const handleDownloadModel = async (modelId: string) => {
    try {
      await pullModelMutation.mutateAsync(modelId);
      notifications.show({
        title: 'Download Started',
        message: `Model ${modelId} is now downloading. This may take some time.`,
        color: 'blue'
      });
      // Refetch models to update status
      modelsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: 'Download Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red'
      });
    }
  };

  // Handle fallback chain creation
  const handleCreateFallbackChain = async () => {
    if (!newChainName || newChainModels.length === 0) {
      notifications.show({
        title: 'Invalid Chain',
        message: 'Please provide a name and select at least one model',
        color: 'red'
      });
      return;
    }

    try {
      await createFallbackChainMutation.mutateAsync({
        name: newChainName,
        models: newChainModels,
        description: `Chain created on ${new Date().toLocaleString()}`,
        is_default: false
      });

      notifications.show({
        title: 'Chain Created',
        message: `Fallback chain "${newChainName}" created successfully`,
        color: 'teal'
      });

      // Reset form and close modal
      setNewChainName('');
      setNewChainModels([]);
      setCreateChainModalOpen(false);
      
      // Refetch models to update fallback chains
      modelsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: 'Error Creating Chain',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red'
      });
    }
  };

  // Handle setting default fallback chain
  const handleSetDefaultFallbackChain = async (chainId: string) => {
    try {
      await setDefaultFallbackChainMutation.mutateAsync(chainId);
      setSelectedFallbackChain(chainId);
      
      notifications.show({
        title: 'Default Chain Set',
        message: `Fallback chain set as default`,
        color: 'teal'
      });
      
      // Refetch to update current chain
      modelsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: 'Error Setting Default Chain',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red'
      });
    }
  };

  // Initialize selected fallback chain
  useEffect(() => {
    if (currentFallbackChain && !selectedFallbackChain) {
      setSelectedFallbackChain(currentFallbackChain);
    }
  }, [currentFallbackChain]);

  // Format size for display
  const formatSize = (sizeBytes?: number) => {
    if (!sizeBytes) return 'Unknown';
    
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    return `${sizeGB.toFixed(1)} GB`;
  };

  // Get icon for model capability
  const getCapabilityIcon = (capability: ModelCapability) => {
    switch (capability) {
      case ModelCapability.CODE:
        return <IconTerminal size={14} />;
      case ModelCapability.TEXT:
        return <IconBrain size={14} />;
      case ModelCapability.VISION:
        return <IconInfoCircle size={14} />;
      case ModelCapability.STRUCTURED:
        return <IconCategory size={14} />;
      case ModelCapability.MULTILINGUAL:
        return <IconTerminal size={14} />;
      default:
        return <IconBrain size={14} />;
    }
  };

  // Get color for model status
  const getStatusColor = (status: ModelStatus) => {
    switch (status) {
      case ModelStatus.AVAILABLE:
        return 'green';
      case ModelStatus.DOWNLOADING:
        return 'blue';
      case ModelStatus.UNAVAILABLE:
        return 'gray';
      case ModelStatus.ERROR:
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get color for model size
  const getSizeColor = (size: ModelSize) => {
    switch (size) {
      case ModelSize.TINY:
        return 'lime';
      case ModelSize.SMALL:
        return 'green';
      case ModelSize.MEDIUM:
        return 'blue';
      case ModelSize.LARGE:
        return 'violet';
      case ModelSize.XLARGE:
        return 'grape';
      default:
        return 'gray';
    }
  };

  // Get icon for provider
  const getProviderIcon = (provider: ModelProvider) => {
    switch (provider) {
      case ModelProvider.OLLAMA:
        return <IconTerminal size={14} />;
      case ModelProvider.OPENAI:
        return <IconBrain size={14} />;
      case ModelProvider.ANTHROPIC:
        return <IconArrowsShuffle size={14} />;
      case ModelProvider.HUGGINGFACE:
        return <IconServer size={14} />;
      default:
        return <IconBrain size={14} />;
    }
  };

  // Render model card
  const renderModelCard = (model: Model) => {
    const isActive = model.id === currentModel;
    const isDownloading = model.status === ModelStatus.DOWNLOADING;
    const isAvailable = model.status === ModelStatus.AVAILABLE;
    const isInError = model.status === ModelStatus.ERROR;

    return (
      <Card 
        key={model.id}
        withBorder
        padding="sm"
        radius="md"
        style={{
          opacity: isAvailable ? 1 : 0.8,
          borderColor: isActive ? theme.colors.blue[5] : undefined,
          borderWidth: isActive ? 2 : 1,
        }}
      >
        <Card.Section p="xs" withBorder bg={isActive ? theme.colors.blue[0] : undefined}>
          <Group justify="space-between">
            <Group>
              <ThemeIcon radius="xl" size="md" color={getStatusColor(model.status)}>
                {isAvailable ? (
                  <IconCheck size={14} />
                ) : isDownloading ? (
                  <Loader size="xs" />
                ) : isInError ? (
                  <IconX size={14} />
                ) : (
                  <IconCloudDownload size={14} />
                )}
              </ThemeIcon>
              <Text fw={500} size="sm" truncate>{model.name}</Text>
            </Group>
            
            <Badge color={getSizeColor(model.size)} size="xs">{model.size}</Badge>
          </Group>
        </Card.Section>
        
        <Box mt="xs">
          <Group gap="xs" mb="xs" wrap="nowrap">
            <Badge 
              size="xs" 
              color="gray" 
              variant="outline"
              leftSection={getProviderIcon(model.provider)}
            >
              {model.provider}
            </Badge>
            
            {model.capabilities.slice(0, 2).map(cap => (
              <Badge key={cap} size="xs" variant="dot">
                {cap}
              </Badge>
            ))}
            
            {model.capabilities.length > 2 && (
              <Badge size="xs" variant="dot">
                +{model.capabilities.length - 2}
              </Badge>
            )}
          </Group>
          
          {model.size_mb && (
            <Text size="xs" c="dimmed">Size: {formatSize(model.size_mb)}</Text>
          )}
          
          {model.metrics?.avg_response_time && (
            <Text size="xs" c="dimmed">
              Avg. Response: {Math.round(model.metrics.avg_response_time / 1000)}s
            </Text>
          )}
          
          {model.error && (
            <Text size="xs" c="red" lineClamp={1}>
              Error: {model.error}
            </Text>
          )}
        </Box>
        
        <Group mt="sm" gap="xs">
          {isAvailable ? (
            <Button 
              fullWidth
              size="xs" 
              variant={isActive ? "filled" : "light"} 
              color={isActive ? "blue" : "gray"}
              onClick={() => handleModelSelect(model.id)}
              disabled={isActive}
            >
              {isActive ? 'Active' : 'Select'}
            </Button>
          ) : isDownloading ? (
            <Button 
              fullWidth
              size="xs" 
              variant="light" 
              color="blue"
              disabled
              leftSection={<Loader size="xs" />}
            >
              Downloading...
            </Button>
          ) : (
            <Button 
              fullWidth
              size="xs" 
              variant="light" 
              color="gray"
              leftSection={<IconDownload size={14} />}
              onClick={() => handleDownloadModel(model.id)}
            >
              Download
            </Button>
          )}
        </Group>
      </Card>
    );
  };

  // Render compact view
  if (compact) {
    return (
      <Stack>
        <Select
          label="Active Model"
          value={currentModel}
          onChange={(value) => value && handleModelSelect(value)}
          data={models.map(model => ({
            value: model.id,
            label: `${model.name} ${model.status === ModelStatus.AVAILABLE ? '✓' : ''}`,
            disabled: model.status !== ModelStatus.AVAILABLE
          }))}
          rightSection={modelsQuery.isLoading ? <Loader size="xs" /> : <IconChevronDown size={14} />}
        />
        
        <Group>
          <Button 
            size="xs" 
            variant="light" 
            color="blue"
            leftSection={<IconRefresh size={14} />}
            onClick={() => modelsQuery.refetch()}
          >
            Refresh
          </Button>
          
          {showAdvanced && (
            <Button 
              size="xs" 
              variant="subtle" 
              color="gray"
              leftSection={<IconSettings size={14} />}
              onClick={() => setAdvancedMode(true)}
            >
              Advanced
            </Button>
          )}
        </Group>
        
        {/* Advanced modal */}
        <Modal
          opened={advancedMode}
          onClose={() => setAdvancedMode(false)}
          title="Model Settings"
          size="lg"
        >
          <EnhancedModelSelector showAdvanced={false} onModelChange={onModelChange} />
        </Modal>
      </Stack>
    );
  }

  // Render full view
  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <Title order={3}>
          <Group gap="xs">
            <IconBrain size={24} />
            <Text>AI Models</Text>
          </Group>
        </Title>
        
        <Group>
          <Button 
            size="xs" 
            variant="light" 
            leftSection={<IconRefresh size={14} />}
            onClick={() => modelsQuery.refetch()}
          >
            Refresh
          </Button>
        </Group>
      </Group>
      
      {modelsQuery.isLoading && (
        <Paper withBorder p="md" radius="md">
          <Group justify="center">
            <Loader size="sm" />
            <Text>Loading models...</Text>
          </Group>
        </Paper>
      )}
      
      {modelsQuery.isError && (
        <Paper withBorder p="md" radius="md" bg={theme.colors.red[0]}>
          <Group>
            <IconAlertCircle color={theme.colors.red[6]} />
            <Text c="red">Error loading models. Please try again.</Text>
          </Group>
        </Paper>
      )}
      
      {!modelsQuery.isLoading && !modelsQuery.isError && (
        <>
          {/* Filters */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Group>
                <Select
                  size="xs"
                  label="Category"
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value || 'all')}
                  data={[
                    { value: 'all', label: 'All Categories' },
                    ...groups.map(group => ({
                      value: group.name,
                      label: group.name
                    }))
                  ]}
                />
                
                <Select
                  size="xs"
                  label="Provider"
                  value={selectedProvider}
                  onChange={(value) => setSelectedProvider(value || 'all')}
                  data={[
                    { value: 'all', label: 'All Providers' },
                    ...providers.map(provider => ({
                      value: provider,
                      label: provider
                    }))
                  ]}
                />
                
                <Select
                  size="xs"
                  label="Size"
                  value={selectedSize}
                  onChange={(value) => setSelectedSize(value || 'all')}
                  data={[
                    { value: 'all', label: 'All Sizes' },
                    { value: ModelSize.TINY, label: 'Tiny' },
                    { value: ModelSize.SMALL, label: 'Small' },
                    { value: ModelSize.MEDIUM, label: 'Medium' },
                    { value: ModelSize.LARGE, label: 'Large' },
                    { value: ModelSize.XLARGE, label: 'X-Large' }
                  ]}
                />
              </Group>
              
              <Select
                size="xs"
                label="Sort By"
                value={sortBy}
                onChange={(value) => setSortBy(value || 'name')}
                data={[
                  { value: 'name', label: 'Name' },
                  { value: 'size', label: 'Size' },
                  { value: 'status', label: 'Status' },
                  { value: 'provider', label: 'Provider' }
                ]}
                icon={<IconSort size={14} />}
              />
            </Group>
          </Paper>
          
          {/* Current Model & Fallback */}
          <Paper withBorder p="md" radius="md" bg={theme.colors.blue[0]}>
            <Stack>
              <Group justify="space-between">
                <Group>
                  <Text fw={500}>Active Model:</Text>
                  <Badge color="blue" size="lg">
                    {currentModel || 'None selected'}
                  </Badge>
                </Group>
                
                <Group>
                  <Text fw={500}>Fallback Chain:</Text>
                  <Menu>
                    <Menu.Target>
                      <Button 
                        size="xs" 
                        variant="subtle"
                        rightSection={<IconChevronDown size={14} />}
                      >
                        {currentFallbackChain || 'None'}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {fallbackChains.map(chain => (
                        <Menu.Item 
                          key={chain.name}
                          onClick={() => handleSetDefaultFallbackChain(chain.name)}
                          rightSection={
                            chain.name === currentFallbackChain ? (
                              <IconCheck size={14} color={theme.colors.green[6]} />
                            ) : null
                          }
                        >
                          {chain.name}
                        </Menu.Item>
                      ))}
                      <Menu.Divider />
                      <Menu.Item 
                        onClick={() => setCreateChainModalOpen(true)}
                        leftSection={<IconPlus size={14} />}
                      >
                        Create New Chain
                      </Menu.Item>
                      <Menu.Item 
                        onClick={() => setFallbackChainModalOpen(true)}
                        leftSection={<IconSettings size={14} />}
                      >
                        Manage Chains
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Stack>
          </Paper>
          
          {/* Model Lists */}
          <Tabs defaultValue="available">
            <Tabs.List>
              <Tabs.Tab 
                value="available" 
                leftSection={<IconCheck size={14} />}
                rightSection={
                  <Badge size="xs" variant="filled" color="green">
                    {availableModels.length}
                  </Badge>
                }
              >
                Available
              </Tabs.Tab>
              <Tabs.Tab 
                value="downloading" 
                leftSection={<IconDownload size={14} />}
                rightSection={
                  <Badge size="xs" variant="filled" color="blue">
                    {downloadingModels.length}
                  </Badge>
                }
              >
                Downloading
              </Tabs.Tab>
              <Tabs.Tab 
                value="other" 
                leftSection={<IconCloudDownload size={14} />}
                rightSection={
                  <Badge size="xs" variant="filled" color="gray">
                    {unavailableModels.length}
                  </Badge>
                }
              >
                Available to Download
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="available" pt="xs">
              {availableModels.length === 0 ? (
                <Paper withBorder p="md" mt="md" ta="center">
                  <Text c="dimmed">No available models match your filters</Text>
                </Paper>
              ) : (
                <SimpleGrid 
                  cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
                  spacing="md"
                  mt="md"
                >
                  {availableModels.map(renderModelCard)}
                </SimpleGrid>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="downloading" pt="xs">
              {downloadingModels.length === 0 ? (
                <Paper withBorder p="md" mt="md" ta="center">
                  <Text c="dimmed">No models are currently downloading</Text>
                </Paper>
              ) : (
                <SimpleGrid 
                  cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
                  spacing="md"
                  mt="md"
                >
                  {downloadingModels.map(renderModelCard)}
                </SimpleGrid>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="other" pt="xs">
              {unavailableModels.length === 0 ? (
                <Paper withBorder p="md" mt="md" ta="center">
                  <Text c="dimmed">No additional models available to download</Text>
                </Paper>
              ) : (
                <SimpleGrid 
                  cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
                  spacing="md"
                  mt="md"
                >
                  {unavailableModels.map(renderModelCard)}
                </SimpleGrid>
              )}
            </Tabs.Panel>
          </Tabs>
        </>
      )}
      
      {/* Create Chain Modal */}
      <Modal
        opened={createChainModalOpen}
        onClose={() => setCreateChainModalOpen(false)}
        title="Create Fallback Chain"
      >
        <Stack>
          <Text size="sm">
            Create a fallback chain of models to try in order when an error explanation is requested.
          </Text>
          
          <Select
            label="Chain Name"
            placeholder="Enter a name for this chain"
            value={newChainName}
            onChange={setNewChainName}
            data={[]}
            searchable
            creatable
            getCreateLabel={(query) => `Create "${query}"`}
            onCreate={(query) => {
              setNewChainName(query);
              return null;
            }}
          />
          
          <Text size="sm" fw={500}>Select Models in Order:</Text>
          
          <Stack>
            {availableModels.map(model => (
              <Group key={model.id} justify="space-between">
                <Group>
                  <Chip
                    checked={newChainModels.includes(model.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setNewChainModels([...newChainModels, model.id]);
                      } else {
                        setNewChainModels(newChainModels.filter(id => id !== model.id));
                      }
                    }}
                  >
                    {model.name}
                  </Chip>
                </Group>
                
                <Group gap="xs">
                  <Badge size="xs" color={getSizeColor(model.size)}>{model.size}</Badge>
                  <Badge size="xs" variant="outline">{model.provider}</Badge>
                </Group>
              </Group>
            ))}
          </Stack>
          
          {newChainModels.length > 0 && (
            <Paper withBorder p="sm" radius="md" mt="sm">
              <Text size="sm" fw={500}>Selected Fallback Order:</Text>
              <List size="sm" mt="xs">
                {newChainModels.map((modelId, index) => {
                  const model = models.find(m => m.id === modelId);
                  return (
                    <List.Item key={modelId}>
                      <Group gap="xs">
                        <Badge size="xs">{index + 1}</Badge>
                        <Text>{model?.name || modelId}</Text>
                        
                        {index > 0 && (
                          <ActionIcon 
                            size="xs" 
                            color="blue"
                            onClick={() => {
                              const newOrder = [...newChainModels];
                              const temp = newOrder[index];
                              newOrder[index] = newOrder[index - 1];
                              newOrder[index - 1] = temp;
                              setNewChainModels(newOrder);
                            }}
                          >
                            <IconArrowDown size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </List.Item>
                  );
                })}
              </List>
            </Paper>
          )}
          
          <Group justify="right" mt="md">
            <Button 
              variant="outline" 
              onClick={() => setCreateChainModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFallbackChain}
              disabled={!newChainName || newChainModels.length === 0}
              loading={createFallbackChainMutation.isPending}
            >
              Create Chain
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* Fallback Chain Modal */}
      <Modal
        opened={fallbackChainModalOpen}
        onClose={() => setFallbackChainModalOpen(false)}
        title="Manage Fallback Chains"
        size="lg"
      >
        <Stack>
          <Text size="sm">
            Fallback chains determine which models to try in order if the primary model fails.
          </Text>
          
          <Accordion>
            {fallbackChains.map(chain => (
              <Accordion.Item key={chain.name} value={chain.name}>
                <Accordion.Control>
                  <Group>
                    <Text>{chain.name}</Text>
                    {chain.name === currentFallbackChain && (
                      <Badge color="green">Default</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack>
                    {chain.description && (
                      <Text size="sm">{chain.description}</Text>
                    )}
                    
                    <Text size="sm" fw={500}>Fallback Order:</Text>
                    <List size="sm">
                      {chain.models.map((modelId, index) => {
                        const model = models.find(m => m.id === modelId);
                        return (
                          <List.Item key={modelId}>
                            <Group gap="xs">
                              <Badge size="xs">{index + 1}</Badge>
                              <Text>{model?.name || modelId}</Text>
                              
                              {model && (
                                <Group gap="xs">
                                  <Badge size="xs" color={getSizeColor(model.size)}>
                                    {model.size}
                                  </Badge>
                                  <Badge 
                                    size="xs" 
                                    color={getStatusColor(model.status)}
                                  >
                                    {model.status}
                                  </Badge>
                                </Group>
                              )}
                            </Group>
                          </List.Item>
                        );
                      })}
                    </List>
                    
                    <Group justify="right" mt="xs">
                      {chain.name !== currentFallbackChain && (
                        <Button 
                          size="xs"
                          variant="light"
                          onClick={() => handleSetDefaultFallbackChain(chain.name)}
                          loading={setDefaultFallbackChainMutation.isPending}
                        >
                          Set as Default
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
          
          <Group justify="right" mt="md">
            <Button 
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setFallbackChainModalOpen(false);
                setCreateChainModalOpen(true);
              }}
            >
              Create New Chain
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default EnhancedModelSelector;