// File: frontend/src/components/ExplainError/ExplainError.tsx

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
  Tabs,
  SegmentedControl
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
  IconRocket,
  IconArrowsUp
} from '@tabler/icons-react';

// Import from unified API client
import { api, hooks } from '../../api/unified';
import { ErrorExplanationRequest, ErrorExplanationResponse } from '../../api/unified';

// Import utils
import { analyzeError, ErrorCategory } from '../../utils/errorAnalytics';
import { createPromptBundle } from '../../utils/promptEngineering';
import { createEnhancedPromptBundle } from '../../utils/enhancedPromptEngineering';
import { analyzeErrorEnhanced } from '../../utils/enhancedErrorAnalytics';
import { 
  usePromptEngineering, 
  PromptEngineeringLevel 
} from '../../context/PromptEngineeringContext';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';
import ProgressIndicator from '../UI/ProgressIndicator';
import ErrorContext from './ErrorContext';
import useAppStore from '../../store/appStore';
import { EventDetails } from '../../types/errorHandling';

// Destructure hooks for better readability
const { useExplainError } = hooks;

interface ExplainErrorProps {
  eventDetails: EventDetails;
}

/**
 * ExplainError component uses AI to explain the error in plain language
 * This version uses the unified API client and enhanced prompt engineering
 */
const ExplainError: React.FC<ExplainErrorProps> = ({ eventDetails }) => {
  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [modelSelectorOpen, setModelSelectorOpen] = useState<boolean>(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState<boolean>(false);
  const [errorContextVisible, setErrorContextVisible] = useState<boolean>(false);
  
  // Get active model from app store
  const { activeAIModel } = useAppStore(state => ({
    activeAIModel: state.activeAIModel
  }));
  
  // Get prompt engineering context
  const {
    level,
    enhancedContext,
    systemPrompt,
    userPrompt,
    enhancedAvailable,
    debugMode,
    setLevel,
    generatePrompts,
    toggleDebugMode
  } = usePromptEngineering();
  
  // Extract error details
  const errorType = extractErrorType(eventDetails);
  const errorMessage = extractErrorMessage(eventDetails);
  const isFallbackData = eventDetails?._fallback === true;
  
  // Use the mutation hook from the unified API
  const explainMutation = useExplainError();
  
  // Generate prompts when the component mounts or when event details change
  useEffect(() => {
    if (eventDetails) {
      generatePrompts(eventDetails);
    }
  }, [eventDetails, generatePrompts]);
  
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
        retryCount
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
    
    // Use prompt engineering based on the current level
    if (level !== PromptEngineeringLevel.DISABLED) {
      // Add prompts based on level
      if (level === PromptEngineeringLevel.ENHANCED && enhancedAvailable) {
        const { systemPrompt, userPrompt, errorContext } = createEnhancedPromptBundle(eventDetails);
        // Add enhanced prompts to context
        request.context = {
          ...request.context,
          systemPrompt,
          userPrompt,
          useContextPrompting: true,
          contextLevel: 'enhanced',
          errorCategory: errorContext.category,
          errorSubtype: errorContext.subtype,
          extendedCategory: errorContext.extendedCategory,
          severity: errorContext.severity,
          applicationContext: errorContext.applicationContext,
        };
      } else {
        const { systemPrompt, userPrompt, errorContext } = createPromptBundle(eventDetails);
        // Add basic prompts to context
        request.context = {
          ...request.context,
          systemPrompt,
          userPrompt,
          useContextPrompting: true,
          contextLevel: 'basic',
          errorCategory: errorContext.category,
          errorSubtype: errorContext.subtype,
          severity: errorContext.severity
        };
      }
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
  
  // Re-generate explanation when prompt engineering setting changes
  useEffect(() => {
    if (expanded && explainMutation.data) {
      console.log("Prompt engineering level changed to", level, "- regenerating explanation");
      // Add a short delay to avoid UI jank
      const timer = setTimeout(() => {
        handleRetry();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [level]);
  
  // Handle model change from model selector modal
  const handleModelChange = (): void => {
    // Model name will be updated in the store by the ModelSelector component
    // We'll regenerate via the useEffect when activeAIModel changes
    setModelSelectorOpen(false);
  };
  
  // Handle prompt engineering level change
  const handlePromptLevelChange = (value: string): void => {
    setLevel(value as PromptEngineeringLevel);
  };
  
  // Toggle error context visibility
  const toggleErrorContext = (): void => {
    setErrorContextVisible(prev => !prev);
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
  
  // Get category display name
  const getCategoryDisplayName = (category?: ErrorCategory) => {
    if (!category) return 'Unknown';
    return category.toString().charAt(0).toUpperCase() + 
           category.toString().slice(1).replace('_', ' ');
  };
  
  // Get error category color
  const getCategoryColor = (category?: ErrorCategory) => {
    if (!category) return 'gray';
    
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
  
  // Get prompt level color
  const getPromptLevelColor = (promptLevel: PromptEngineeringLevel) => {
    switch (promptLevel) {
      case PromptEngineeringLevel.ENHANCED:
        return 'teal';
      case PromptEngineeringLevel.BASIC:
        return 'blue';
      case PromptEngineeringLevel.DISABLED:
        return 'gray';
      default:
        return 'gray';
    }
  };
  
  // Get prompt level icon
  const getPromptLevelDisplay = (promptLevel: PromptEngineeringLevel) => {
    switch (promptLevel) {
      case PromptEngineeringLevel.ENHANCED:
        return (
          <Badge size="xs" color="teal" variant="filled">
            Enhanced
          </Badge>
        );
      case PromptEngineeringLevel.BASIC:
        return (
          <Badge size="xs" color="blue" variant="filled">
            Basic
          </Badge>
        );
      case PromptEngineeringLevel.DISABLED:
        return (
          <Badge size="xs" color="gray" variant="filled">
            Disabled
          </Badge>
        );
      default:
        return null;
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
              
              {/* Error category badge */}
              {enhancedContext?.category !== ErrorCategory.UNKNOWN && (
                <Badge 
                  color={getCategoryColor(enhancedContext?.category)} 
                  size="sm"
                  leftSection={
                    <IconCategory size={12} />
                  }
                >
                  {getCategoryDisplayName(enhancedContext?.category)}
                </Badge>
              )}
              
              {/* Context level badge */}
              {level !== PromptEngineeringLevel.DISABLED && (
                <Tooltip label="Context-aware prompt level">
                  {getPromptLevelDisplay(level)}
                </Tooltip>
              )}
            </Group>
            
            <Group gap="xs">
              {/* Error context button */}
              <Tooltip label="Show error analysis">
                <Button
                  size="xs"
                  variant="subtle"
                  color={errorContextVisible ? "blue" : "gray"}
                  onClick={toggleErrorContext}
                >
                  <IconArrowsUp size={16} style={{ 
                    transform: errorContextVisible ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s' 
                  }} />
                </Button>
              </Tooltip>
              
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
          </Group>
          
          {/* Error Context Panel */}
          <ErrorContext isOpen={errorContextVisible} />
          
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
                      {enhancedContext?.category !== ErrorCategory.UNKNOWN && (
                        <Badge size="xs" color={getCategoryColor(enhancedContext?.category)}>
                          {getCategoryDisplayName(enhancedContext?.category)}
                        </Badge>
                      )}
                      
                      {enhancedContext?.extendedCategory && (
                        <Badge size="xs" color="gray" variant="outline">
                          {getCategoryDisplayName(enhancedContext?.extendedCategory)}
                        </Badge>
                      )}
                    </Group>
                    
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {explainMutation.data?.explanation || 
                       "No explanation was provided by the AI. This might be due to insufficient information about the error."}
                    </Text>
                    
                    {/* Error context summary */}
                    {enhancedContext?.potentialCauses && enhancedContext.potentialCauses.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Potential Causes:</Text>
                        <Stack gap="xs">
                          {enhancedContext.potentialCauses.slice(0, 3).map((cause, index) => (
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
                        
                        {level !== PromptEngineeringLevel.DISABLED && (
                          <Badge 
                            size="xs" 
                            color={getPromptLevelColor(level)} 
                            variant="dot"
                          >
                            {level === PromptEngineeringLevel.ENHANCED 
                              ? 'Enhanced Context' 
                              : 'Basic Context'}
                          </Badge>
                        )}
                        
                        {explainMutation.data?.processing_time && (
                          <Text size="xs" c="dimmed">
                            ({Math.round(explainMutation.data.processing_time / 1000)}s)
                          </Text>
                        )}
                      </Group>
                      
                      {explainMutation.data?.model && (
                        <Badge size="xs" color="gray" variant="outline">
                          {explainMutation.data.model}
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
                <Box>
                  <Text fw={500} mb="sm">Context-Aware Prompting</Text>
                  <SegmentedControl
                    fullWidth
                    color={getPromptLevelColor(level)}
                    data={[
                      { 
                        label: 'Enhanced', 
                        value: PromptEngineeringLevel.ENHANCED,
                        disabled: !enhancedAvailable
                      },
                      { 
                        label: 'Basic', 
                        value: PromptEngineeringLevel.BASIC 
                      },
                      { 
                        label: 'Disabled', 
                        value: PromptEngineeringLevel.DISABLED 
                      }
                    ]}
                    value={level}
                    onChange={handlePromptLevelChange}
                  />
                  <Text size="xs" c="dimmed" mt="xs">
                    {level === PromptEngineeringLevel.ENHANCED
                      ? 'Enhanced: Advanced error analysis with specialized domain expertise tailored to error types.'
                      : level === PromptEngineeringLevel.BASIC
                        ? 'Basic: Simple error categorization with general prompts.'
                        : 'Disabled: No context-aware prompting, using default AI behavior.'}
                  </Text>
                </Box>
              </Paper>
              
              <Paper withBorder p="md">
                <Group position="apart">
                  <Box>
                    <Text fw={500}>Debug Mode</Text>
                    <Text size="sm" color="dimmed">
                      Show technical details and generated prompts
                    </Text>
                  </Box>
                  <Switch 
                    checked={debugMode}
                    onChange={toggleDebugMode}
                    size="md"
                  />
                </Group>
              </Paper>
              
              {!enhancedAvailable && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  title="Enhanced Mode Unavailable"
                  color="yellow"
                >
                  <Text size="sm">
                    Enhanced context analysis encountered an error. Only basic mode is available.
                  </Text>
                </Alert>
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
              {enhancedContext && (
                <Paper withBorder p="md">
                  <Text fw={500} mb="xs">Error Analysis Debug Info</Text>
                  <Code>
                    {JSON.stringify(enhancedContext, null, 2)}
                  </Code>
                </Paper>
              )}
              
              {level !== PromptEngineeringLevel.DISABLED && systemPrompt && userPrompt && (
                <Paper withBorder p="md">
                  <Text fw={500} mb="xs">Generated Prompts</Text>
                  <Tabs defaultValue="system">
                    <Tabs.List>
                      <Tabs.Tab value="system">System Prompt</Tabs.Tab>
                      <Tabs.Tab value="user">User Prompt</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="system" pt="xs">
                      <Code>
                        {systemPrompt}
                      </Code>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="user" pt="xs">
                      <Code>
                        {userPrompt}
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
        maxHeight: '300px',
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