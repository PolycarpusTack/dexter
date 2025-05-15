// File: frontend/src/components/ExplainError/ExplainError.unified.tsx

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Button, 
  Text, 
  Collapse, 
  Stack, 
  Group, 
  Alert,
  Skeleton,
  ThemeIcon,
  Badge,
  Tooltip,
  Box,
  useMantineTheme,
  Anchor,
  Divider,
  Modal,
  Loader,
  Switch,
  Chip,
  Tabs
} from '@mantine/core';
import { 
  IconBrain, 
  IconChevronDown, 
  IconChevronUp, 
  IconInfoCircle, 
  IconRobot,
  IconBulb,
  IconServer,
  IconAlertCircle,
  IconSettings,
  IconCategory,
  IconAdjustments,
  IconCode,
  IconRocket
} from '@tabler/icons-react';

// Import from unified API client
import { api, hooks } from '../../api/unified';
import { ErrorExplanationRequest, ErrorExplanationResponse } from '../../api/unified';

// Import utils
import { analyzeError, ErrorCategory } from '../../utils/errorAnalytics';
import { createPromptBundle } from '../../utils/promptEngineering';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';
import ProgressIndicator from '../UI/ProgressIndicator';
import useAppStore from '../../store/appStore';
import { EventDetails } from '../../types/errorHandling';

// Destructure hooks for better readability
const { useExplainError } = hooks;

interface ExplainErrorProps {
  eventDetails: EventDetails;
}

/**
 * ExplainError component uses AI to explain the error in plain language
 * This version uses the unified API client
 */
const ExplainError: React.FC<ExplainErrorProps> = ({ eventDetails }) => {
  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [modelSelectorOpen, setModelSelectorOpen] = useState<boolean>(false);
  const [contextPromptingEnabled, setContextPromptingEnabled] = useState<boolean>(true);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState<boolean>(false);
  
  // Get active model from app store
  const { activeAIModel } = useAppStore(state => ({
    activeAIModel: state.activeAIModel
  }));
  
  // Extract error details
  const errorType = extractErrorType(eventDetails);
  const errorMessage = extractErrorMessage(eventDetails);
  const isFallbackData = eventDetails?._fallback === true;
  
  // Get error analysis context
  const errorContext = analyzeError(eventDetails);
  
  // Use the mutation hook from the unified API
  const explainMutation = useExplainError();
  
  // Only send request when user expands the section
  const handleToggle = (): void => {
    if (!expanded && !explainMutation.data && !explainMutation.isPending) {
      generateExplanation();
    }
    setExpanded(!expanded);
  };
  
  // Generate explanation with current model
  const generateExplanation = (): void => {
    // Prepare the request for the new API format
    const request: ErrorExplanationRequest = {
      // Use errorText when we don't have a specific ID
      errorText: errorMessage,
      // Add stack trace if available
      stackTrace: getStackTraceFromEvent(eventDetails),
      // Pass additional context
      context: {
        eventData: eventDetails,
        errorType,
        retryCount,
        category: errorContext.category,
        subtype: errorContext.subtype,
        severity: errorContext.severity
      },
      // Set model
      model: activeAIModel,
      // Configure options
      options: {
        includeRecommendations: true,
        includeCodeExamples: false,
        maxTokens: 2048
      }
    };
    
    // If context-aware prompting is enabled, generate prompts
    if (contextPromptingEnabled) {
      const { systemPrompt, userPrompt } = createPromptBundle(eventDetails);
      // Add prompts to context
      request.context = {
        ...request.context,
        systemPrompt,
        userPrompt,
        useContextPrompting: true
      };
    }
    
    // Call the mutation
    explainMutation.mutate({
      request,
      options: {
        // Set a longer timeout for AI explanation requests
        timeout: 20 * 60 * 1000 // 20 minutes
      }
    });
  };
  
  // Retry with incremented counter
  const handleRetry = (): void => {
    setRetryCount(prev => prev + 1);
    generateExplanation();
  };
  
  // Toggle context-aware prompting
  const toggleContextPrompting = (): void => {
    setContextPromptingEnabled(prev => !prev);
  };
  
  // Re-generate explanation when active model changes
  useEffect(() => {
    if (expanded && explainMutation.data) {
      // Only regenerate if we've already shown an explanation and are expanded
      console.log("Model changed to", activeAIModel, "- regenerating explanation");
      // Add a short delay to avoid UI jank
      const timer = setTimeout(() => {
        handleRetry();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {}; // Add this return statement
  }, [activeAIModel]);
  
  // Re-generate explanation when context prompting setting changes
  useEffect(() => {
    if (expanded && explainMutation.data) {
      console.log("Context-aware prompting setting changed to", contextPromptingEnabled, "- regenerating explanation");
      // Add a short delay to avoid UI jank
      const timer = setTimeout(() => {
        handleRetry();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [contextPromptingEnabled]);
  
  // Handle model change from model selector modal
  const handleModelChange = (): void => {
    // Model name will be updated in the store by the ModelSelector component
    // We'll regenerate via the useEffect when activeAIModel changes
    setModelSelectorOpen(false);
  };
  
  // Check if we have valid event data
  if (!eventDetails || typeof eventDetails !== 'object') {
    return null;
  }
  
  // Extract some useful context from the event
  const { title = 'Error' } = eventDetails;
  
  // Display model name (either from active model or from the response)
  // If we have a response, use that model name, otherwise use the active model
  const displayModelName = explainMutation.data?.model || activeAIModel || 'Ollama';
  
  // Get error category display name
  const getCategoryDisplayName = (category: ErrorCategory) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  };
  
  // Get error category color
  const getCategoryColor = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.DATABASE:
        return 'blue';
      case ErrorCategory.NETWORK:
        return 'orange';
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return 'red';
      case ErrorCategory.VALIDATION:
      case ErrorCategory.INPUT:
        return 'yellow';
      case ErrorCategory.SYNTAX:
        return 'violet';
      case ErrorCategory.DEADLOCK:
        return 'indigo';
      case ErrorCategory.MEMORY:
        return 'pink';
      case ErrorCategory.TIMEOUT:
        return 'orange';
      case ErrorCategory.CONFIGURATION:
        return 'teal';
      case ErrorCategory.DEPENDENCY:
        return 'green';
      default:
        return 'gray';
    }
  };
  
  return (
    <>
      <Paper 
        withBorder 
        p="md" 
        radius="md"
        style={(theme) => ({
          borderLeft: `3px solid ${theme.colors.grape[5]}`,
          backgroundColor: `rgba(232, 222, 248, 0.4)`,
        })}
      >
        <Stack gap="xs">
          {/* Header with toggle */}
          <Group justify="apart">
            <Group gap="xs">
              <ThemeIcon color="grape" size="md" radius="md">
                <IconBrain size={16} />
              </ThemeIcon>
              <Text fw={600}>AI-Powered Explanation</Text>
              
              <Tooltip label="Uses an AI model to explain this error in plain language">
                <AccessibleIcon
                  icon={<IconInfoCircle size={16} color={theme.colors.gray[6]} />}
                  label="About AI explanations"
                />
              </Tooltip>
              
              <Badge 
                color="grape" 
                size="sm" 
                variant="outline"
                rightSection={
                  <Tooltip label="Change AI model settings">
                    <Box component="span" style={{ cursor: 'pointer' }} onClick={(e) => {
                      e.stopPropagation();
                      setModelSelectorOpen(true);
                    }}>
                      <IconSettings size={10} />
                    </Box>
                  </Tooltip>
                }
              >
                {displayModelName}
              </Badge>
              
              {/* Error category badge (new) */}
              {errorContext.category !== ErrorCategory.UNKNOWN && (
                <Badge 
                  color={getCategoryColor(errorContext.category)} 
                  size="sm"
                  leftSection={
                    <IconCategory size={12} />
                  }
                >
                  {getCategoryDisplayName(errorContext.category)}
                </Badge>
              )}
            </Group>
            
            <Group gap="xs">
              {/* Advanced settings button */}
              <Tooltip label="Advanced AI settings">
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => setAdvancedSettingsOpen(true)}
                >
                  <IconAdjustments size={16} />
                </Button>
              </Tooltip>
              
              {/* Explain with AI button */}
              <Button
                onClick={handleToggle}
                variant="subtle"
                color="grape"
                size="xs"
                rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                loading={explainMutation.isPending && !expanded}
                aria-expanded={expanded}
                aria-controls="ai-explanation-content"
              >
                {expanded ? 'Hide' : 'Explain with AI'}
              </Button>
            </Group>
          </Group>
          
          {/* Description */}
          <Group>
            <Text size="sm" c="dimmed">
              Get a simplified explanation of what this error means and potential causes.
              {isFallbackData && " (Limited information available)"}
            </Text>
            
            {contextPromptingEnabled && (
              <Badge size="xs" color="teal" variant="outline">
                Context-Aware
              </Badge>
            )}
          </Group>
          
          {/* Explanation Content */}
          <Collapse in={expanded} id="ai-explanation-content">
            {explainMutation.isPending && (
              <Stack gap="md" mt="md">
                <Group justify="apart" align="center">
                  <Text size="sm">Generating explanation with {activeAIModel || 'AI model'}...</Text>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">This may take up to 20 minutes on first run or with larger models</Text>
                    <Loader size="xs" />
                  </Group>
                </Group>
                
                {/* Progress indicator */}
                <ProgressIndicator 
                  isLoading={explainMutation.isPending} 
                  operation="explanation"
                  model={activeAIModel}
                />
                
                <Paper p="xs" withBorder>
                  <Text size="xs" c="dimmed">
                    Tip: For faster results, try selecting a smaller model like 'mistral:latest' or 'gemma:latest'
                  </Text>
                </Paper>
                <Skeleton height={20} width="90%" radius="md" />
                <Skeleton height={20} width="95%" radius="md" />
                <Skeleton height={20} width="85%" radius="md" />
                <Skeleton height={20} width="70%" radius="md" />
              </Stack>
            )}
            
            {explainMutation.isError && (
              <Alert 
                icon={<IconAlertCircle size={16} />} 
                title="Explanation Failed" 
                color="red"
                mt="md"
              >
                <Stack gap="xs">
                  <Text size="sm">
                    {(explainMutation.error as Error)?.message || 'Failed to generate explanation.'}
                  </Text>
                  
                  {(explainMutation.error as Error)?.message?.includes('connect to LLM service') && (
                    <Box>
                      <Text size="sm" fw={500} mb="xs">Common Solutions:</Text>
                      <Stack gap="xs" mb="sm">
                        <Text size="sm">1. Make sure Ollama is running on your machine</Text>
                        <Text size="sm">2. Verify that you've pulled the required model</Text>
                        <Code>ollama pull {activeAIModel || 'mistral:latest'}</Code>
                        <Text size="sm">3. Check if the Ollama URL is correct in your backend configuration</Text>
                      </Stack>
                    </Box>
                  )}
                  
                  {(explainMutation.error as Error)?.message?.includes('timed out') && (
                    <Box>
                      <Text size="sm" fw={500} mb="xs">Timeout Solutions:</Text>
                      <Stack gap="xs" mb="sm">
                        <Text size="sm">1. Try a smaller, faster model (e.g., mistral instead of llama3)</Text>
                        <Text size="sm">2. Ask your administrator to increase the OLLAMA_TIMEOUT value</Text>
                        <Text size="sm">3. Check if your machine has sufficient resources (CPU/RAM)</Text>
                        <Text size="sm">4. Try again - timeouts can be temporary during high load</Text>
                      </Stack>
                    </Box>
                  )}
                  
                  <Group>
                    <Divider />
                    <Button 
                      size="xs" 
                      variant="light" 
                      color="red" 
                      onClick={handleRetry}
                    >
                      Try Again
                    </Button>
                    
                    <Anchor 
                      href="https://ollama.com/download" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      size="xs"
                    >
                      Get Ollama
                    </Anchor>
                  </Group>
                </Stack>
              </Alert>
            )}
            
            {explainMutation.isSuccess && (
              <Box mt="md">
                <Paper 
                  withBorder
                  p="md" 
                  radius="md"
                  style={{
                    backgroundColor: theme.white,
                    borderColor: theme.colors.gray[3],
                  }}
                >
                  <Stack gap="md">
                    <Group gap="xs">
                      <ThemeIcon 
                        size="sm" 
                        radius="xl" 
                        color="grape"
                        variant="light"
                      >
                        <IconBulb size={12} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">
                        AI Explanation of Error: {title}
                      </Text>
                      
                      {/* Error category badges */}
                      {errorContext.category !== ErrorCategory.UNKNOWN && (
                        <Badge size="xs" color={getCategoryColor(errorContext.category)}>
                          {getCategoryDisplayName(errorContext.category)}
                        </Badge>
                      )}
                      
                      {errorContext.subtype && (
                        <Badge size="xs" color="gray" variant="outline">
                          {errorContext.subtype}
                        </Badge>
                      )}
                    </Group>
                    
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {explainMutation.data?.explanation || 
                       "No explanation was provided by the AI. This might be due to insufficient information about the error."}
                    </Text>
                    
                    {/* Recommendations from the unified API */}
                    {explainMutation.data?.recommendations && explainMutation.data.recommendations.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Recommendations:</Text>
                        <Stack gap="xs">
                          {explainMutation.data.recommendations.map((recommendation, index) => (
                            <Text size="sm" key={index}>• {recommendation}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    
                    {/* Error context summary (from analytics) */}
                    {!explainMutation.data?.recommendations && errorContext.potentialCauses && errorContext.potentialCauses.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Potential Causes:</Text>
                        <Stack gap="xs">
                          {errorContext.potentialCauses.slice(0, 3).map((cause, index) => (
                            <Text size="sm" key={index}>• {cause}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    
                    {/* Processing info */}
                    <Group justify="apart" mt="xs">
                      <Group gap="xs" align="center">
                        <IconServer size={12} color={theme.colors.gray[6]} />
                        <Text size="xs" c="dimmed">
                          Powered by local Ollama LLM
                        </Text>
                        
                        {contextPromptingEnabled && (
                          <Badge size="xs" color="teal" variant="dot">
                            Context-Aware Prompting
                          </Badge>
                        )}
                        
                        {explainMutation.data?.metadata?.processingTime && (
                          <Text size="xs" c="dimmed">
                            ({Math.round(explainMutation.data.metadata.processingTime / 1000)}s)
                          </Text>
                        )}
                        
                        {explainMutation.data?.metadata?.tokenCount && (
                          <Text size="xs" c="dimmed">
                            ({explainMutation.data.metadata.tokenCount} tokens)
                          </Text>
                        )}
                      </Group>
                      
                      {explainMutation.data?.metadata?.model && (
                        <Badge size="xs" color="gray" variant="outline">
                          {explainMutation.data.metadata.model}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Paper>
                
                <Group justify="right" mt="xs">
                  <Button 
                    size="xs" 
                    variant="subtle" 
                    color="gray"
                    leftSection={<IconRobot size={14} />}
                    onClick={handleRetry}
                  >
                    Regenerate
                  </Button>
                </Group>
              </Box>
            )}
          </Collapse>
        </Stack>
      </Paper>
      
      {/* Model Selector Modal */}
      <Modal
        opened={modelSelectorOpen}
        onClose={() => setModelSelectorOpen(false)}
        title="AI Model Selection"
        size="lg"
      >
        <ModelSelector onModelChange={handleModelChange} />
      </Modal>
      
      {/* Advanced Settings Modal */}
      <Modal
        opened={advancedSettingsOpen}
        onClose={() => setAdvancedSettingsOpen(false)}
        title="Advanced AI Settings"
        size="md"
      >
        <Tabs defaultValue="general">
          <Tabs.List>
            <Tabs.Tab value="general" leftSection={<IconSettings size={14} />}>
              General
            </Tabs.Tab>
            <Tabs.Tab value="debug" leftSection={<IconCode size={14} />}>
              Debug
            </Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="general" pt="md">
            <Stack>
              <Paper withBorder p="md">
                <Group position="apart">
                  <Box>
                    <Text fw={500}>Context-Aware Prompting</Text>
                    <Text size="sm" color="dimmed">
                      Analyzes error patterns to generate specialized prompts
                    </Text>
                  </Box>
                  <Switch 
                    checked={contextPromptingEnabled}
                    onChange={toggleContextPrompting}
                    size="md"
                  />
                </Group>
              </Paper>
              
              {errorContext.category !== ErrorCategory.UNKNOWN && (
                <Paper withBorder p="md">
                  <Text fw={500} mb="xs">Detected Error Context</Text>
                  <Stack gap="xs">
                    <Group>
                      <Text size="sm" fw={500} w={100}>Category:</Text>
                      <Badge color={getCategoryColor(errorContext.category)}>
                        {getCategoryDisplayName(errorContext.category)}
                      </Badge>
                    </Group>
                    
                    {errorContext.subtype && (
                      <Group>
                        <Text size="sm" fw={500} w={100}>Subtype:</Text>
                        <Text size="sm">{errorContext.subtype}</Text>
                      </Group>
                    )}
                    
                    {errorContext.severity && (
                      <Group>
                        <Text size="sm" fw={500} w={100}>Severity:</Text>
                        <Badge 
                          color={
                            errorContext.severity === 'critical' ? 'red' : 
                            errorContext.severity === 'high' ? 'orange' :
                            errorContext.severity === 'medium' ? 'yellow' : 'blue'
                          }
                          size="sm"
                        >
                          {errorContext.severity}
                        </Badge>
                      </Group>
                    )}
                    
                    {errorContext.keywords && errorContext.keywords.length > 0 && (
                      <Group align="flex-start">
                        <Text size="sm" fw={500} w={100}>Keywords:</Text>
                        <Box>
                          {errorContext.keywords.slice(0, 10).map((keyword, i) => (
                            <Badge key={i} size="xs" variant="outline" style={{ margin: '0 4px 4px 0' }}>
                              {keyword}
                            </Badge>
                          ))}
                        </Box>
                      </Group>
                    )}
                  </Stack>
                </Paper>
              )}
              
              <Group position="right" mt="md">
                <Button 
                  onClick={() => setAdvancedSettingsOpen(false)}
                  leftSection={<IconRocket size={16} />}
                >
                  Apply Settings
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
          
          <Tabs.Panel value="debug" pt="md">
            <Stack>
              <Paper withBorder p="md">
                <Text fw={500} mb="xs">Error Analysis Debug Info</Text>
                <Code>
                  {JSON.stringify(errorContext, null, 2)}
                </Code>
              </Paper>
              
              {contextPromptingEnabled && (
                <Paper withBorder p="md">
                  <Text fw={500} mb="xs">Generated Prompts</Text>
                  <Tabs defaultValue="system">
                    <Tabs.List>
                      <Tabs.Tab value="system">System Prompt</Tabs.Tab>
                      <Tabs.Tab value="user">User Prompt</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="system" pt="xs">
                      <Code>
                        {createPromptBundle(eventDetails).systemPrompt}
                      </Code>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="user" pt="xs">
                      <Code>
                        {createPromptBundle(eventDetails).userPrompt}
                      </Code>
                    </Tabs.Panel>
                  </Tabs>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
};

// Helper component for code snippets
interface CodeProps {
  children: React.ReactNode;
}

const Code: React.FC<CodeProps> = ({ children }) => {
  const theme = useMantineTheme();
  
  return (
    <Box
      style={{
        fontFamily: 'monospace',
        backgroundColor: theme.colors.gray[1],
        padding: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        fontSize: '0.85rem',
        overflowX: 'auto',
        maxWidth: '100%'
      }}
    >
      {children}
    </Box>
  );
};

// Helper function to extract stack trace from event data
function getStackTraceFromEvent(eventDetails: EventDetails): string | undefined {
  if (!eventDetails) return undefined;
  
  // Check exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    const exValue = eventDetails.exception.values[0];
    if (exValue?.stacktrace?.frames) {
      return exValue.stacktrace.frames
        .map(frame => {
          const lineInfo = frame.lineno ? `:${frame.lineno}` : '';
          return `at ${frame.function || 'anonymous'} (${frame.filename || 'unknown'}${lineInfo})`;
        })
        .join('\n');
    }
  }
  
  // Return raw trace if available
  if (eventDetails?.stacktrace) {
    return typeof eventDetails.stacktrace === 'string' 
      ? eventDetails.stacktrace 
      : JSON.stringify(eventDetails.stacktrace);
  }
  
  return undefined;
}

// Helper function to extract error type from event data
function extractErrorType(eventDetails: EventDetails): string {
  if (!eventDetails) return 'Unknown';
  
  // Check in exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    return eventDetails.exception.values[0]?.type || 'Unknown';
  }
  
  // Check in entries
  if (eventDetails?.entries?.length && eventDetails.entries.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry?.data?.values?.length && entry.data.values.length > 0) {
        return entry.data.values[0]?.type || 'Unknown';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventDetails.title || '';
  if (title.includes(': ')) {
    return title?.split(': ')[0] || '';
  }
  
  return eventDetails.level || 'Error';
}

// Helper function to extract error message from event data
function extractErrorMessage(eventDetails: EventDetails): string {
  if (!eventDetails) return '';
  
  // Check direct message field
  if (eventDetails.message) {
    return eventDetails.message;
  }
  
  // Check in exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    return eventDetails.exception.values[0]?.value || '';
  }
  
  // Check in entries
  if (eventDetails?.entries?.length && eventDetails.entries.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry?.data?.values?.length && entry.data.values.length > 0) {
        return entry.data.values[0]?.value || '';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventDetails.title || '';
  if (title.includes(': ')) {
    return title.split(': ').slice(1).join(': ');
  }
  
  return title;
}

export default ExplainError;