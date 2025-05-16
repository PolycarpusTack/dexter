// File: frontend/src/components/Settings/AIModelSettings.tsx

import { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Title,
  Text,
  Menu,
  ActionIcon,
  Tooltip,
  Badge,
  ThemeIcon,
  Modal,
  Button,
  Alert,
  Stack,
  Switch,
  Divider,
  Tabs
} from '@mantine/core';
import {
  IconBrain,
  IconSettings,
  IconDotsVertical,
  IconRefresh,
  IconCheck,
  IconInfoCircle,
  IconAlertCircle,
  IconSettings2,
  IconCpu,
  IconDeviceDesktop,
  IconServer,
  IconArrowsShuffle,
  IconLink
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import ModelSelector from '../ModelSelector/ModelSelector';
import EnhancedModelSelector from '../ModelSelector/EnhancedModelSelector';
import ProviderSettings from './ProviderSettings';
import useAppStore from '../../store/appStore';
import { validateForm, required, oneOf } from '../../utils/formValidation';

// Import from the unified API client
import { hooks } from '../../api/unified';

// Import the hooks we need
const { useAiModels } = hooks;

// Import the AI hooks using namespace
import useAi from '../../api/unified/hooks/useAi';

// Define window interface to add our custom global function
declare global {
  interface Window {
    openAIModelSettings?: () => void;
  }
}

// Import types from the unified API
import { AiModel } from '../../api/unified';

interface ModelConfig {
  maxTokens: number;
  promptTemplate: string;
  useContextPrompting: boolean;
  useCaching: boolean;
  preferredModel: string;
}

interface ModelConfigErrors {
  maxTokens: string | null;
  promptTemplate: string | null;
  preferredModel: string | null;
}

interface AIModelSettingsProps {
  compact?: boolean;
}

/**
 * AI model settings component that supports both legacy and enhanced multi-model operation
 */
function AIModelSettings({ compact = false }: AIModelSettingsProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<string>('model');
  const [useEnhancedModels, setUseEnhancedModels] = useState<boolean>(true);
  
  const { 
    activeAIModel, 
    setActiveAIModel, 
    enableTelemetry, 
    setEnableTelemetry 
  } = useAppStore();
  
  // Expose a function for external components to open these settings
  useEffect(() => {
    window.openAIModelSettings = () => {
      setSettingsTab('model');
      setModalOpen(true);
    };
    return () => { 
      delete window.openAIModelSettings; 
    };
  }, []);
  
  // Advanced configuration state
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    maxTokens: 2048,
    promptTemplate: 'default',
    useContextPrompting: true,
    useCaching: true,
    preferredModel: activeAIModel || ''
  });
  
  const [configErrors, setConfigErrors] = useState<ModelConfigErrors>({
    maxTokens: null,
    promptTemplate: null,
    preferredModel: null
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({
    maxTokens: false,
    promptTemplate: false,
    preferredModel: false
  });
  
  // Validation rules for advanced settings
  const validationRules = {
    maxTokens: [
      required('Maximum tokens is required'),
      {
        test: (value: any) => {
          const numValue = Number(value);
          return !isNaN(numValue) && numValue >= 256 && numValue <= 16384;
        },
        message: 'Maximum tokens must be between 256 and 16384'
      }
    ],
    promptTemplate: [
      required('Prompt template is required'),
      oneOf(['default', 'advanced', 'simple', 'detailed'], 'Invalid prompt template type')
    ],
    preferredModel: [
      required('Preferred model is required')
    ]
  };
  
  // Fetch models using either legacy or enhanced API
  const legacyModelsQuery = useAiModels({
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    enabled: !useEnhancedModels
  });
  
  const enhancedModelsQuery = useAi.useModelsEnhanced({
    refetchInterval: 30000,
    enabled: useEnhancedModels
  });
  
  const isLoading = useEnhancedModels 
    ? enhancedModelsQuery.isLoading 
    : legacyModelsQuery.isLoading;
  
  const refetch = useEnhancedModels
    ? enhancedModelsQuery.refetch
    : legacyModelsQuery.refetch;
  
  // Transform the data to the expected format
  const currentModelName = activeAIModel || 
    (useEnhancedModels 
      ? enhancedModelsQuery.data?.current_model 
      : Array.isArray(legacyModelsQuery.data) 
        ? legacyModelsQuery.data.find(model => model.isDefault)?.name
        : ''
    ) || 'Unknown';
  
  // Update preferred model when active model changes
  useEffect(() => {
    if (activeAIModel && activeAIModel !== modelConfig.preferredModel) {
      setModelConfig(prev => ({
        ...prev,
        preferredModel: activeAIModel
      }));
    }
  }, [activeAIModel]);
  
  // Validate a field when it changes
  const validateField = (field: keyof ModelConfigErrors, value: any) => {
    const fieldRules = validationRules[field];
    if (fieldRules) {
      for (const rule of fieldRules) {
        if (!rule.test(value)) {
          setConfigErrors(prev => ({ ...prev, [field]: rule.message }));
          return false;
        }
      }
      setConfigErrors(prev => ({ ...prev, [field]: null }));
      return true;
    }
    return true;
  };
  
  // Handle field changes
  const handleConfigChange = (field: keyof ModelConfig, value: any) => {
    setModelConfig(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      validateField(field, value);
    }
  };
  
  // Mark field as touched on blur
  const handleBlur = (field: keyof ModelConfigErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, modelConfig[field as keyof ModelConfig]);
  };
  
  // Validate all fields
  const validateAllFields = () => {
    const result = validateForm(modelConfig, validationRules as any);
    setConfigErrors(result.errors as ModelConfigErrors);
    
    // Mark all fields as touched
    setTouched({
      maxTokens: true,
      promptTemplate: true,
      preferredModel: true
    });
    
    return result.isValid;
  };
  
  // Apply advanced settings
  const applyAdvancedSettings = () => {
    if (!validateAllFields()) {
      return;
    }
    
    // In a real implementation, we would save these settings to the store
    // or send them to the API. For this demo, we'll just update the active model.
    if (modelConfig.preferredModel && modelConfig.preferredModel !== activeAIModel) {
      setActiveAIModel(modelConfig.preferredModel);
    }
    
    setModalOpen(false);
  };
  
  // Find the active model in the models list
  const activeModel = useEnhancedModels 
    ? enhancedModelsQuery.data?.models?.find(m => m.id === currentModelName)
    : Array.isArray(legacyModelsQuery.data)
      ? legacyModelsQuery.data.find(m => m.name === currentModelName || m.id === currentModelName)
      : undefined;
    
  const isModelAvailable = useEnhancedModels
    ? activeModel?.status === ModelStatus.AVAILABLE
    : activeModel?.status === 'available';
  
  // Render the model status indicator
  const modelStatus = isModelAvailable ? (
    <Tooltip label="Model is loaded and ready" withArrow>
      <Badge size="xs" color="green" leftSection={<IconCheck size={10} />}>
        Ready
      </Badge>
    </Tooltip>
  ) : isLoading ? (
    <Badge size="xs" color="gray" leftSection={<Button size="xs" loading={isLoading} variant="subtle" />}>
      Checking...
    </Badge>
  ) : (
    <Tooltip label="Model needs to be downloaded or loaded" withArrow>
      <Badge size="xs" color="yellow">
        Not ready
      </Badge>
    </Tooltip>
  );
  
  // Compute whether the advanced settings form is valid
  const isFormValid = !configErrors.maxTokens && 
                      !configErrors.promptTemplate && 
                      !configErrors.preferredModel;
  
  // Render compact view if requested
  if (compact) {
    return (
      <Stack>
        <Group justify="space-between">
          <Group>
            <ThemeIcon color="grape" radius="xl" size="md">
              <IconBrain size={16} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>Active AI Model</Text>
              <Group gap={4}>
                <Text size="xs" color="dimmed">
                  {currentModelName}
                </Text>
                {modelStatus}
              </Group>
            </div>
          </Group>
          
          <Group gap="xs">
            <Switch 
              size="xs"
              label="Enhanced"
              checked={useEnhancedModels}
              onChange={(event) => setUseEnhancedModels(event.currentTarget.checked)}
            />
            
            <Menu position="bottom-end" shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              
              <Menu.Dropdown>
                <Menu.Label>AI Model</Menu.Label>
                <Menu.Item 
                  leftSection={<IconSettings size={14} />}
                  onClick={() => {
                    setSettingsTab('model');
                    setModalOpen(true);
                  }}
                >
                  Change model
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings2 size={14} />}
                  onClick={() => {
                    setSettingsTab('advanced');
                    setModalOpen(true);
                  }}
                >
                  Advanced settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => refetch()}
                >
                  Check status
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Stack>
    );
  }
  
  // Render full view
  return (
    <>
      <Paper withBorder p="md" radius="md">
        <Stack>
          <Group justify="space-between">
            <Title order={3}>
              <Group gap="xs">
                <IconBrain size={24} />
                <Text>AI Model Settings</Text>
              </Group>
            </Title>
            
            <Switch 
              label="Enhanced Multi-Model Support"
              checked={useEnhancedModels}
              onChange={(event) => setUseEnhancedModels(event.currentTarget.checked)}
            />
          </Group>
          
          {useEnhancedModels && (
            <Alert color="blue" title="Enhanced Multi-Model Support" icon={<IconInfoCircle />}>
              Enhanced mode provides support for multiple model providers, fallback chains, and advanced model selection capabilities.
            </Alert>
          )}
          
          <Tabs defaultValue="models">
            <Tabs.List>
              <Tabs.Tab value="models" leftSection={<IconBrain size={14} />}>
                Models
              </Tabs.Tab>
              <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>
                Settings
              </Tabs.Tab>
              <Tabs.Tab value="providers" leftSection={<IconServer size={14} />}>
                Providers
              </Tabs.Tab>
            </Tabs.List>
            
            <Tabs.Panel value="models" pt="md">
              {useEnhancedModels ? (
                <EnhancedModelSelector />
              ) : (
                <ModelSelector />
              )}
            </Tabs.Panel>
            
            <Tabs.Panel value="settings" pt="md">
              <Stack>
                <Title order={4}>AI Settings</Title>
                
                <Paper withBorder p="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon color="blue" variant="light">
                        <IconLink size={16} />
                      </ThemeIcon>
                      <div>
                        <Text fw={500}>Enable AI Telemetry</Text>
                        <Text size="xs" c="dimmed">
                          Share anonymous usage data to improve AI features
                        </Text>
                      </div>
                    </Group>
                    
                    <Switch 
                      checked={enableTelemetry}
                      onChange={(event) => setEnableTelemetry(event.currentTarget.checked)}
                    />
                  </Group>
                </Paper>
                
                <Paper withBorder p="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon color="indigo" variant="light">
                        <IconArrowsShuffle size={16} />
                      </ThemeIcon>
                      <div>
                        <Text fw={500}>Auto-Select Model</Text>
                        <Text size="xs" c="dimmed">
                          Automatically select the best model for each error type
                        </Text>
                      </div>
                    </Group>
                    
                    <Switch defaultChecked />
                  </Group>
                </Paper>
                
                <Paper withBorder p="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon color="grape" variant="light">
                        <IconCpu size={16} />
                      </ThemeIcon>
                      <div>
                        <Text fw={500}>Maximum Tokens</Text>
                        <Text size="xs" c="dimmed">
                          Controls the maximum length of AI explanations
                        </Text>
                      </div>
                    </Group>
                    
                    <input
                      type="number"
                      value={modelConfig.maxTokens}
                      onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 0)}
                      onBlur={() => handleBlur('maxTokens')}
                      min={256}
                      max={16384}
                      style={{
                        width: '80px',
                        padding: '8px',
                        borderRadius: '4px',
                        border: configErrors.maxTokens && touched.maxTokens 
                          ? '1px solid red' 
                          : '1px solid #ced4da'
                      }}
                    />
                  </Group>
                </Paper>
              </Stack>
            </Tabs.Panel>
            
            <Tabs.Panel value="providers" pt="md">
              <Stack>
                <Title order={4}>AI Providers</Title>
                
                <Paper withBorder p="md">
                  <Group>
                    <ThemeIcon color="teal" variant="light">
                      <IconServer size={16} />
                    </ThemeIcon>
                    <div>
                      <Group>
                        <Text fw={500}>Ollama</Text>
                        <Badge color="green">Connected</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Local LLM provider (default: http://localhost:11434)
                      </Text>
                    </div>
                  </Group>
                  
                  <Divider my="md" />
                  
                  {useEnhancedModels && (
                    <>
                      {/* Render the ProviderSettings component */}
                      <ProviderSettings />
                    </>
                  )}
                </Paper>
                
                {!useEnhancedModels && (
                  <Alert 
                    icon={<IconAlertCircle size={16} />} 
                    color="yellow"
                    title="Limited Provider Support"
                  >
                    Enable Enhanced Multi-Model Support to configure additional AI providers.
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>
      
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Group>
            <Title order={4}>
              {settingsTab === 'model' ? 'AI Model Selection' : 'Advanced AI Settings'}
            </Title>
            <Badge size="sm" color="grape">Current: {currentModelName}</Badge>
          </Group>
        }
        size="lg"
      >
        {settingsTab === 'model' ? (
          useEnhancedModels ? (
            <EnhancedModelSelector onModelChange={() => setModalOpen(false)} />
          ) : (
            <ModelSelector onModelChange={() => setModalOpen(false)} />
          )
        ) : (
          <Stack>
            <Alert 
              color="blue" 
              variant="light" 
              icon={<IconInfoCircle size={16} />}
              title="Advanced AI Configuration"
            >
              <Text size="sm">
                These settings control how the AI model generates explanations.
                Most users should leave these at their default values.
              </Text>
            </Alert>
            
            {/* Validation errors alert */}
            {!isFormValid && (Object.values(touched).some(t => t)) && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
                title="Please fix the following errors:"
              >
                <Stack gap="xs">
                  {configErrors.maxTokens && (
                    <Text size="xs">• {configErrors.maxTokens}</Text>
                  )}
                  {configErrors.promptTemplate && (
                    <Text size="xs">• {configErrors.promptTemplate}</Text>
                  )}
                  {configErrors.preferredModel && (
                    <Text size="xs">• {configErrors.preferredModel}</Text>
                  )}
                </Stack>
              </Alert>
            )}
            
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group wrap="nowrap" align="flex-start">
                  <ThemeIcon size="lg" radius="md" color="indigo">
                    <IconCpu size={18} />
                  </ThemeIcon>
                  <div style={{ flexGrow: 1 }}>
                    <Text fw={500} mb={5}>Model Processing Settings</Text>
                    
                    <Group grow align="flex-start">
                      <div>
                        <Text size="sm" fw={500} mb={5}>Maximum Tokens</Text>
                        <input
                          type="number"
                          value={modelConfig.maxTokens}
                          onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 0)}
                          onBlur={() => handleBlur('maxTokens')}
                          min={256}
                          max={16384}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: configErrors.maxTokens && touched.maxTokens 
                              ? '1px solid red' 
                              : '1px solid #ced4da'
                          }}
                        />
                        {configErrors.maxTokens && touched.maxTokens && (
                          <Text size="xs" color="red" mt={5}>
                            {configErrors.maxTokens}
                          </Text>
                        )}
                        <Text size="xs" color="dimmed" mt={5}>
                          Controls the maximum length of AI explanations. Higher values allow for more detailed responses but use more processing power.
                        </Text>
                      </div>
                      
                      <div>
                        <Text size="sm" fw={500} mb={5}>Prompt Template</Text>
                        <select
                          value={modelConfig.promptTemplate}
                          onChange={(e) => handleConfigChange('promptTemplate', e.target.value)}
                          onBlur={() => handleBlur('promptTemplate')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: configErrors.promptTemplate && touched.promptTemplate 
                              ? '1px solid red' 
                              : '1px solid #ced4da'
                          }}
                        >
                          <option value="default">Default</option>
                          <option value="simple">Simple</option>
                          <option value="advanced">Advanced</option>
                          <option value="detailed">Detailed</option>
                        </select>
                        {configErrors.promptTemplate && touched.promptTemplate && (
                          <Text size="xs" color="red" mt={5}>
                            {configErrors.promptTemplate}
                          </Text>
                        )}
                        <Text size="xs" color="dimmed" mt={5}>
                          Determines how detailed the AI instructions are for error explanations.
                        </Text>
                      </div>
                    </Group>
                  </div>
                </Group>
                
                <Divider />
                
                <Group wrap="nowrap" align="flex-start">
                  <ThemeIcon size="lg" radius="md" color="blue">
                    <IconDeviceDesktop size={18} />
                  </ThemeIcon>
                  <div style={{ flexGrow: 1 }}>
                    <Text fw={500} mb={5}>Performance Optimizations</Text>
                    
                    <Stack gap="xs">
                      <Switch
                        label="Use context-aware prompting"
                        description="Analyzes error context to create better AI prompts"
                        checked={modelConfig.useContextPrompting}
                        onChange={(e) => handleConfigChange('useContextPrompting', e.currentTarget.checked)}
                      />
                      
                      <Switch
                        label="Enable response caching"
                        description="Caches similar error explanations to improve response times"
                        checked={modelConfig.useCaching}
                        onChange={(e) => handleConfigChange('useCaching', e.currentTarget.checked)}
                      />
                    </Stack>
                  </div>
                </Group>
                
                <Divider />
                
                <Group wrap="nowrap" align="flex-start">
                  <ThemeIcon size="lg" radius="md" color="grape">
                    <IconBrain size={18} />
                  </ThemeIcon>
                  <div style={{ flexGrow: 1 }}>
                    <Text fw={500} mb={5}>Default Model</Text>
                    <Text size="sm" mb={5}>
                      Set your preferred model for error explanations
                    </Text>
                    
                    {useEnhancedModels ? (
                      <select
                        value={modelConfig.preferredModel}
                        onChange={(e) => handleConfigChange('preferredModel', e.target.value)}
                        onBlur={() => handleBlur('preferredModel')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: configErrors.preferredModel && touched.preferredModel 
                            ? '1px solid red' 
                            : '1px solid #ced4da'
                        }}
                      >
                        <option value="">Select a model</option>
                        {enhancedModelsQuery.data?.models
                          .filter(m => m.status === ModelStatus.AVAILABLE)
                          .map(model => (
                            <option key={`option-model-${model.id}`} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <select
                        value={modelConfig.preferredModel}
                        onChange={(e) => handleConfigChange('preferredModel', e.target.value)}
                        onBlur={() => handleBlur('preferredModel')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: configErrors.preferredModel && touched.preferredModel 
                            ? '1px solid red' 
                            : '1px solid #ced4da'
                        }}
                      >
                        <option value="">Select a model</option>
                        {Array.isArray(legacyModelsQuery.data) 
                          ? legacyModelsQuery.data
                              .filter(m => m.status === 'available')
                              .map(model => (
                                <option key={`option-legacy-${model.id || model.name}`} value={model.id || model.name}>
                                  {model.name}
                                </option>
                              ))
                          : null
                        }
                      </select>
                    )}
                    
                    {configErrors.preferredModel && touched.preferredModel && (
                      <Text size="xs" color="red" mt={5}>
                        {configErrors.preferredModel}
                      </Text>
                    )}
                  </div>
                </Group>
              </Stack>
            </Paper>
            
            <Group position="right" mt="md">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={applyAdvancedSettings}
                disabled={!isFormValid}
              >
                Apply Settings
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

// Import needed for TypeScript to avoid errors
import { ModelStatus } from '../../api/unified/types';

export default AIModelSettings;