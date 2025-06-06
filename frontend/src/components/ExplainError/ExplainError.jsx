// File: frontend/src/components/ExplainError/ExplainError.jsx

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
  Loader
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
  IconSettings
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { explainError } from '../../api/aiApi';
import { showErrorNotification } from '../../utils/errorHandling';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';
import ProgressIndicator from '../UI/ProgressIndicator';
import useAppStore from '../../store/appStore';

/**
 * ExplainError component uses AI to explain the error in plain language
 */
function ExplainError({ eventDetails }) {
  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  
  // Get active model from app store
  const { activeAIModel } = useAppStore(state => ({
    activeAIModel: state.activeAIModel
  }));
  
  // Extract error details
  const errorType = extractErrorType(eventDetails);
  const errorMessage = extractErrorMessage(eventDetails);
  const isFallbackData = eventDetails?._fallback === true;
  
  // Mutation for AI explanation
  const explainMutation = useMutation({
    mutationFn: (params) => explainError(params),
    onError: (error) => {
      showErrorNotification({
        title: 'AI Explanation Failed',
        error,
      });
    },
  });
  
  // Only send request when user expands the section
  const handleToggle = () => {
    if (!expanded && !explainMutation.data && !explainMutation.isPending) {
      generateExplanation();
    }
    setExpanded(!expanded);
  };
  
  // Generate explanation with current model
  const generateExplanation = () => {
    explainMutation.mutate({ 
      event_data: eventDetails,
      error_type: errorType,
      error_message: errorMessage,
      retry_count: retryCount,
      model: activeAIModel
    });
  };
  
  // Retry with incremented counter
  const handleRetry = () => {
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
  }, [activeAIModel]);
  
  // Handle model change from model selector modal
  const handleModelChange = (modelName) => {
    // Model name will be updated in the store by the ModelSelector component
    // We'll regenerate via the useEffect when activeAIModel changes
    setModelSelectorOpen(false);
  };
  
  // Check if we have valid event data
  if (!eventDetails || typeof eventDetails !== 'object') {
    return null;
  }
  
  // Extract some useful context from the event
  const { title = 'Error', level } = eventDetails;
  
  // Display model name (either from active model or from the response)
  // If we have a response, use that model name, otherwise use the active model
  const displayModelName = explainMutation.data?.model_used || activeAIModel || 'Ollama';
  
  return (
    <>
      <Paper 
        withBorder 
        p="md" 
        radius="md"
        sx={theme => ({
          borderLeft: `3px solid ${theme.colors.grape[5]}`,
          backgroundColor: theme.fn.rgba(theme.colors.grape[0], 0.4),
        })}
      >
        <Stack gap="xs">
          {/* Header with toggle */}
          <Group position="apart">
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
                    <Box component="span" sx={{ cursor: 'pointer' }} onClick={(e) => {
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
            </Group>
            
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
          
          {/* Description */}
          <Text size="sm" c="dimmed">
            Get a simplified explanation of what this error means and potential causes.
            {isFallbackData && " (Limited information available)"}
          </Text>
          
          {/* Explanation Content */}
          <Collapse in={expanded} id="ai-explanation-content">
            {explainMutation.isPending && (
              <Stack gap="md" mt="md">
                <Group position="apart" align="center">
                  <Text size="sm">Generating explanation with {activeAIModel || 'AI model'}...</Text>
                  <Group spacing="xs">
                    <Text size="xs" c="dimmed">This may take several minutes on slower hardware</Text>
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
                    {explainMutation.error?.message || 'Failed to generate explanation.'}
                  </Text>
                  
                  {explainMutation.error?.message?.includes('connect to LLM service') && (
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
                  
                  {explainMutation.error?.message?.includes('timed out') && (
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
                  sx={{
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
                    </Group>
                    
                    <Text size="sm" sx={{ whiteSpace: 'pre-wrap' }}>
                      {explainMutation.data?.explanation || 
                       "No explanation was provided by the AI. This might be due to insufficient information about the error."}
                    </Text>
                    
                    {explainMutation.data?.error && (
                      <Alert 
                        color="yellow" 
                        title="AI Service Warning" 
                        icon={<IconServer size={16} />}
                      >
                        <Text size="sm">{explainMutation.data.error}</Text>
                      </Alert>
                    )}
                    
                    <Group position="apart" mt="xs">
                      <Text size="xs" c="dimmed">
                        Powered by local Ollama LLM
                      </Text>
                      {explainMutation.data?.model_used && (
                        <Badge size="xs" color="gray" variant="outline">
                          {explainMutation.data.model_used}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Paper>
                
                <Group position="right" mt="xs">
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
    </>
  );
}

// Helper component for code snippets
function Code({ children }) {
  const theme = useMantineTheme();
  
  return (
    <Box
      sx={{
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
}

// Helper function to extract error type from event data
function extractErrorType(eventDetails) {
  if (!eventDetails) return 'Unknown';
  
  // Check in exception values
  if (eventDetails.exception?.values?.length > 0) {
    return eventDetails.exception.values[0].type || 'Unknown';
  }
  
  // Check in entries
  if (eventDetails.entries?.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry.data?.values?.length > 0) {
        return entry.data.values[0].type || 'Unknown';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventDetails.title || '';
  if (title.includes(': ')) {
    return title.split(': ')[0];
  }
  
  return eventDetails.level || 'Error';
}

// Helper function to extract error message from event data
function extractErrorMessage(eventDetails) {
  if (!eventDetails) return '';
  
  // Check direct message field
  if (eventDetails.message) {
    return eventDetails.message;
  }
  
  // Check in exception values
  if (eventDetails.exception?.values?.length > 0) {
    return eventDetails.exception.values[0].value || '';
  }
  
  // Check in entries
  if (eventDetails.entries?.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry.data?.values?.length > 0) {
        return entry.data.values[0].value || '';
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