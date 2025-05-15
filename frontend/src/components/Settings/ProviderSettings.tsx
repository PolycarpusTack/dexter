import React, { useState, useEffect } from 'react';
import { Card, Title, Divider, TextInput, Select, Group, Button, Text, Stack, Switch, NumberInput, Badge, Accordion, Box, Tabs, Alert } from '@mantine/core';
import { useConfig } from '../../api/unified/hooks/useConfig';
import { useSetProviderConfig, useTestProviderConnection } from '../../api/unified/hooks/useAi';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconCircleX, IconServer, IconApi, IconKey } from '@tabler/icons-react';

/**
 * ProviderSettings component for configuring AI providers
 * This component allows users to configure API keys and settings for OpenAI and Anthropic
 */
const ProviderSettings: React.FC = () => {
  const { data: config, isLoading: isConfigLoading } = useConfig();
  const setProviderConfig = useSetProviderConfig();
  const testConnection = useTestProviderConnection();
  
  const [activeTab, setActiveTab] = useState<string | null>('openai');
  
  // OpenAI settings
  const [openAiKey, setOpenAiKey] = useState('');
  const [openAiOrgId, setOpenAiOrgId] = useState('');
  const [openAiBaseUrl, setOpenAiBaseUrl] = useState('https://api.openai.com/v1');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  const [openAiTimeout, setOpenAiTimeout] = useState(30);
  const [useAzure, setUseAzure] = useState(false);
  const [enableOpenAi, setEnableOpenAi] = useState(false);
  
  // Anthropic settings
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('https://api.anthropic.com');
  const [anthropicApiVersion, setAnthropicApiVersion] = useState('v1');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-opus-20240229');
  const [anthropicTimeout, setAnthropicTimeout] = useState(30);
  const [enableAnthropic, setEnableAnthropic] = useState(false);
  
  // Connection status
  const [openAiConnectionStatus, setOpenAiConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [anthropicConnectionStatus, setAnthropicConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  
  // Load initial settings
  useEffect(() => {
    if (config) {
      // OpenAI settings
      setOpenAiKey(config.OPENAI_API_KEY || '');
      setOpenAiOrgId(config.OPENAI_ORGANIZATION_ID || '');
      setOpenAiBaseUrl(config.OPENAI_API_BASE || 'https://api.openai.com/v1');
      setOpenAiModel(config.OPENAI_DEFAULT_MODEL || 'gpt-4o');
      setOpenAiTimeout(config.OPENAI_TIMEOUT || 30);
      setUseAzure(config.OPENAI_USE_AZURE || false);
      setEnableOpenAi(config.ENABLE_OPENAI || false);
      
      // Anthropic settings
      setAnthropicKey(config.ANTHROPIC_API_KEY || '');
      setAnthropicBaseUrl(config.ANTHROPIC_API_BASE || 'https://api.anthropic.com');
      setAnthropicApiVersion(config.ANTHROPIC_API_VERSION || 'v1');
      setAnthropicModel(config.ANTHROPIC_DEFAULT_MODEL || 'claude-3-opus-20240229');
      setAnthropicTimeout(config.ANTHROPIC_TIMEOUT || 30);
      setEnableAnthropic(config.ENABLE_ANTHROPIC || false);
    }
  }, [config]);
  
  // Save OpenAI settings
  const saveOpenAiSettings = async () => {
    try {
      await setProviderConfig.mutateAsync({
        provider: 'openai',
        config: {
          OPENAI_API_KEY: openAiKey,
          OPENAI_ORGANIZATION_ID: openAiOrgId,
          OPENAI_API_BASE: openAiBaseUrl,
          OPENAI_DEFAULT_MODEL: openAiModel,
          OPENAI_TIMEOUT: openAiTimeout,
          OPENAI_USE_AZURE: useAzure,
          ENABLE_OPENAI: enableOpenAi
        }
      });
      
      notifications.show({
        title: 'Settings saved',
        message: 'OpenAI settings saved successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to save OpenAI settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };
  
  // Save Anthropic settings
  const saveAnthropicSettings = async () => {
    try {
      await setProviderConfig.mutateAsync({
        provider: 'anthropic',
        config: {
          ANTHROPIC_API_KEY: anthropicKey,
          ANTHROPIC_API_BASE: anthropicBaseUrl,
          ANTHROPIC_API_VERSION: anthropicApiVersion,
          ANTHROPIC_DEFAULT_MODEL: anthropicModel,
          ANTHROPIC_TIMEOUT: anthropicTimeout,
          ENABLE_ANTHROPIC: enableAnthropic
        }
      });
      
      notifications.show({
        title: 'Settings saved',
        message: 'Anthropic settings saved successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to save Anthropic settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };
  
  // Test OpenAI connection
  const testOpenAiConnection = async () => {
    try {
      setOpenAiConnectionStatus('unknown');
      const result = await testConnection.mutateAsync({
        provider: 'openai',
        apiKey: openAiKey,
        baseUrl: openAiBaseUrl
      });
      
      setOpenAiConnectionStatus(result.success ? 'success' : 'error');
      
      if (result.success) {
        notifications.show({
          title: 'Connection successful',
          message: 'Successfully connected to OpenAI API',
          color: 'green'
        });
      } else {
        notifications.show({
          title: 'Connection failed',
          message: result.message || 'Failed to connect to OpenAI API',
          color: 'red'
        });
      }
    } catch (error) {
      setOpenAiConnectionStatus('error');
      notifications.show({
        title: 'Connection failed',
        message: `Failed to connect to OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };
  
  // Test Anthropic connection
  const testAnthropicConnection = async () => {
    try {
      setAnthropicConnectionStatus('unknown');
      const result = await testConnection.mutateAsync({
        provider: 'anthropic',
        apiKey: anthropicKey,
        baseUrl: anthropicBaseUrl
      });
      
      setAnthropicConnectionStatus(result.success ? 'success' : 'error');
      
      if (result.success) {
        notifications.show({
          title: 'Connection successful',
          message: 'Successfully connected to Anthropic API',
          color: 'green'
        });
      } else {
        notifications.show({
          title: 'Connection failed',
          message: result.message || 'Failed to connect to Anthropic API',
          color: 'red'
        });
      }
    } catch (error) {
      setAnthropicConnectionStatus('error');
      notifications.show({
        title: 'Connection failed',
        message: `Failed to connect to Anthropic API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };
  
  if (isConfigLoading) {
    return <Text>Loading settings...</Text>;
  }
  
  return (
    <Stack spacing="md">
      <Title order={2}>AI Provider Settings</Title>
      
      <Alert 
        icon={<IconAlertCircle size={16} />} 
        title="API Keys Required" 
        color="blue"
      >
        To use external AI providers like OpenAI and Anthropic, you need to provide valid API keys. These keys are stored on the server and never exposed to clients.
      </Alert>
      
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="openai" icon={<IconApi size={14} />}>
            OpenAI
            {openAiConnectionStatus === 'success' && (
              <Badge color="green" size="xs" ml={5}>Connected</Badge>
            )}
            {openAiConnectionStatus === 'error' && (
              <Badge color="red" size="xs" ml={5}>Error</Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="anthropic" icon={<IconApi size={14} />}>
            Anthropic
            {anthropicConnectionStatus === 'success' && (
              <Badge color="green" size="xs" ml={5}>Connected</Badge>
            )}
            {anthropicConnectionStatus === 'error' && (
              <Badge color="red" size="xs" ml={5}>Error</Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="ollama" icon={<IconServer size={14} />}>
            Ollama
          </Tabs.Tab>
        </Tabs.List>
        
        {/* OpenAI Settings */}
        <Tabs.Panel value="openai" pt="xs">
          <Card shadow="sm" p="md">
            <Group position="apart" mb="xs">
              <Title order={3}>OpenAI Settings</Title>
              <Switch 
                label="Enable OpenAI" 
                checked={enableOpenAi} 
                onChange={(event) => setEnableOpenAi(event.currentTarget.checked)}
              />
            </Group>
            <Divider my="sm" />
            
            <Stack spacing="md">
              <TextInput
                label="API Key"
                placeholder="Enter your OpenAI API key"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.currentTarget.value)}
                type="password"
                required
                icon={<IconKey size={16} />}
                disabled={!enableOpenAi}
              />
              
              <TextInput
                label="Organization ID (Optional)"
                placeholder="Enter your OpenAI Organization ID"
                value={openAiOrgId}
                onChange={(e) => setOpenAiOrgId(e.currentTarget.value)}
                disabled={!enableOpenAi}
              />
              
              <Accordion>
                <Accordion.Item value="advanced">
                  <Accordion.Control>Advanced Settings</Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="sm">
                      <TextInput
                        label="API Base URL"
                        placeholder="Enter API base URL"
                        value={openAiBaseUrl}
                        onChange={(e) => setOpenAiBaseUrl(e.currentTarget.value)}
                        disabled={!enableOpenAi}
                      />
                      
                      <Select
                        label="Default Model"
                        placeholder="Select default model"
                        value={openAiModel}
                        onChange={(value) => setOpenAiModel(value || 'gpt-4o')}
                        data={[
                          { value: 'gpt-4o', label: 'GPT-4o' },
                          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                          { value: 'gpt-4', label: 'GPT-4' },
                          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                        ]}
                        disabled={!enableOpenAi}
                      />
                      
                      <NumberInput
                        label="Request Timeout (seconds)"
                        value={openAiTimeout}
                        onChange={(value) => setOpenAiTimeout(Number(value) || 30)}
                        min={5}
                        max={120}
                        disabled={!enableOpenAi}
                      />
                      
                      <Switch
                        label="Use Azure OpenAI"
                        checked={useAzure}
                        onChange={(event) => setUseAzure(event.currentTarget.checked)}
                        disabled={!enableOpenAi}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              
              <Group position="apart" mt="md">
                <Button
                  onClick={testOpenAiConnection}
                  disabled={!enableOpenAi || !openAiKey}
                  loading={testConnection.isLoading}
                >
                  Test Connection
                </Button>
                
                <Button
                  onClick={saveOpenAiSettings}
                  disabled={!enableOpenAi}
                  loading={setProviderConfig.isLoading}
                >
                  Save Settings
                </Button>
              </Group>
              
              {openAiConnectionStatus === 'success' && (
                <Alert icon={<IconCheck size={16} />} color="green" title="Connection Successful">
                  Successfully connected to the OpenAI API. Your configuration is valid.
                </Alert>
              )}
              
              {openAiConnectionStatus === 'error' && (
                <Alert icon={<IconCircleX size={16} />} color="red" title="Connection Failed">
                  Failed to connect to the OpenAI API. Please check your API key and settings.
                </Alert>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>
        
        {/* Anthropic Settings */}
        <Tabs.Panel value="anthropic" pt="xs">
          <Card shadow="sm" p="md">
            <Group position="apart" mb="xs">
              <Title order={3}>Anthropic Settings</Title>
              <Switch 
                label="Enable Anthropic" 
                checked={enableAnthropic} 
                onChange={(event) => setEnableAnthropic(event.currentTarget.checked)}
              />
            </Group>
            <Divider my="sm" />
            
            <Stack spacing="md">
              <TextInput
                label="API Key"
                placeholder="Enter your Anthropic API key"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.currentTarget.value)}
                type="password"
                required
                icon={<IconKey size={16} />}
                disabled={!enableAnthropic}
              />
              
              <Accordion>
                <Accordion.Item value="advanced">
                  <Accordion.Control>Advanced Settings</Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="sm">
                      <TextInput
                        label="API Base URL"
                        placeholder="Enter API base URL"
                        value={anthropicBaseUrl}
                        onChange={(e) => setAnthropicBaseUrl(e.currentTarget.value)}
                        disabled={!enableAnthropic}
                      />
                      
                      <TextInput
                        label="API Version"
                        placeholder="Enter API version"
                        value={anthropicApiVersion}
                        onChange={(e) => setAnthropicApiVersion(e.currentTarget.value)}
                        disabled={!enableAnthropic}
                      />
                      
                      <Select
                        label="Default Model"
                        placeholder="Select default model"
                        value={anthropicModel}
                        onChange={(value) => setAnthropicModel(value || 'claude-3-opus-20240229')}
                        data={[
                          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
                          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
                          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
                          { value: 'claude-2.1', label: 'Claude 2.1' },
                          { value: 'claude-2.0', label: 'Claude 2.0' },
                          { value: 'claude-instant-1.2', label: 'Claude Instant 1.2' }
                        ]}
                        disabled={!enableAnthropic}
                      />
                      
                      <NumberInput
                        label="Request Timeout (seconds)"
                        value={anthropicTimeout}
                        onChange={(value) => setAnthropicTimeout(Number(value) || 30)}
                        min={5}
                        max={120}
                        disabled={!enableAnthropic}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              
              <Group position="apart" mt="md">
                <Button
                  onClick={testAnthropicConnection}
                  disabled={!enableAnthropic || !anthropicKey}
                  loading={testConnection.isLoading}
                >
                  Test Connection
                </Button>
                
                <Button
                  onClick={saveAnthropicSettings}
                  disabled={!enableAnthropic}
                  loading={setProviderConfig.isLoading}
                >
                  Save Settings
                </Button>
              </Group>
              
              {anthropicConnectionStatus === 'success' && (
                <Alert icon={<IconCheck size={16} />} color="green" title="Connection Successful">
                  Successfully connected to the Anthropic API. Your configuration is valid.
                </Alert>
              )}
              
              {anthropicConnectionStatus === 'error' && (
                <Alert icon={<IconCircleX size={16} />} color="red" title="Connection Failed">
                  Failed to connect to the Anthropic API. Please check your API key and settings.
                </Alert>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>
        
        {/* Ollama Settings */}
        <Tabs.Panel value="ollama" pt="xs">
          <Card shadow="sm" p="md">
            <Title order={3}>Ollama Settings</Title>
            <Text color="dimmed">
              Ollama is a local LLM server that runs models on your machine. Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> to learn more.
            </Text>
            <Divider my="sm" />
            
            <Stack spacing="md">
              <Alert title="Local Deployment" color="blue">
                Ollama settings are managed through the main configuration file and environment variables. The current connection status is shown below.
              </Alert>
              
              <Box>
                <Group>
                  <Text weight={500}>Status:</Text>
                  {config?.ENABLE_OLLAMA ? (
                    <Badge color="green">Enabled</Badge>
                  ) : (
                    <Badge color="red">Disabled</Badge>
                  )}
                </Group>
                <Group mt="xs">
                  <Text weight={500}>Server URL:</Text>
                  <Text>{config?.OLLAMA_BASE_URL || 'http://localhost:11434'}</Text>
                </Group>
                <Group mt="xs">
                  <Text weight={500}>Default Model:</Text>
                  <Text>{config?.OLLAMA_MODEL || 'llama2'}</Text>
                </Group>
              </Box>
              
              <Text size="sm" color="dimmed">
                To change these settings, modify the server configuration or environment variables.
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ProviderSettings;