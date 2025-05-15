// File: frontend/src/components/ExplainError/ErrorContext.tsx

import React from 'react';
import {
  Paper,
  Text,
  Group,
  Badge,
  Stack,
  Card,
  ThemeIcon,
  Table,
  Switch,
  Title,
  Tabs,
  Button,
  CopyButton,
  Tooltip,
  Collapse,
  Box,
  useMantineTheme,
  Select
} from '@mantine/core';
import {
  IconBrain,
  IconCode,
  IconSubtask,
  IconChecks,
  IconCategory,
  IconDeviceAnalytics,
  IconContext,
  IconZoomQuestion,
  IconBulb,
  IconCodeCircle,
  IconStack2,
  IconAppWindow,
  IconCopy,
  IconCheck,
  IconInfoCircle,
  IconSettings,
  IconAdjustments,
  IconRocket
} from '@tabler/icons-react';

import { ErrorCategory } from '../../utils/errorAnalytics';
import { 
  ExtendedErrorCategory, 
  ApplicationContext,
  RuntimeContext 
} from '../../utils/enhancedErrorAnalytics';
import { 
  usePromptEngineering, 
  PromptEngineeringLevel 
} from '../../context/PromptEngineeringContext';
import AccessibleIcon from '../UI/AccessibleIcon';

interface ErrorContextProps {
  isOpen: boolean;
}

/**
 * ErrorContext component displays detailed error analysis and prompt engineering settings
 */
const ErrorContext: React.FC<ErrorContextProps> = ({ isOpen }) => {
  const theme = useMantineTheme();
  
  // Get prompt engineering context
  const {
    level,
    enhancedContext,
    systemPrompt,
    userPrompt,
    enhancedAvailable,
    debugMode,
    setLevel,
    toggleDebugMode
  } = usePromptEngineering();
  
  // Get category display name
  const getCategoryDisplayName = (category?: ErrorCategory | ExtendedErrorCategory) => {
    if (!category) return 'Unknown';
    return category.toString()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get category color
  const getCategoryColor = (category?: ErrorCategory | ExtendedErrorCategory) => {
    if (!category) return 'gray';
    
    const categoryStr = category.toString();
    
    if (categoryStr.includes('database')) return 'blue';
    if (categoryStr.includes('deadlock')) return 'indigo';
    if (categoryStr.includes('network')) return 'orange';
    if (categoryStr.includes('auth')) return 'red';
    if (categoryStr.includes('validation') || categoryStr.includes('data')) return 'yellow';
    if (categoryStr.includes('react')) return 'cyan';
    if (categoryStr.includes('api')) return 'grape';
    if (categoryStr.includes('resource')) return 'pink';
    if (categoryStr.includes('config')) return 'teal';
    if (categoryStr.includes('timeout')) return 'orange';
    if (categoryStr.includes('file')) return 'lime';
    if (categoryStr.includes('dependency')) return 'green';
    if (categoryStr.includes('code')) return 'violet';
    if (categoryStr.includes('memory')) return 'pink';
    
    return 'gray';
  };
  
  // Get context color
  const getContextColor = (context?: ApplicationContext) => {
    if (!context) return 'gray';
    
    switch (context) {
      case ApplicationContext.API_CLIENT: return 'blue';
      case ApplicationContext.EVENT_TABLE: return 'indigo';
      case ApplicationContext.DEADLOCK_ANALYZER: return 'violet';
      case ApplicationContext.ERROR_HANDLING: return 'red';
      case ApplicationContext.DATA_VISUALIZATION: return 'cyan';
      case ApplicationContext.SETTINGS: return 'teal';
      case ApplicationContext.AUTH: return 'orange';
      case ApplicationContext.NAVIGATION: return 'lime';
      case ApplicationContext.SEARCH: return 'grape';
      case ApplicationContext.FILTERING: return 'yellow';
      default: return 'gray';
    }
  };
  
  // Get confidence color
  const getConfidenceColor = (confidence?: number) => {
    if (confidence === undefined) return 'gray';
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'teal';
    if (confidence >= 0.4) return 'yellow';
    if (confidence >= 0.2) return 'orange';
    return 'red';
  };
  
  // Get severity color
  const getSeverityColor = (severity?: string) => {
    if (!severity) return 'gray';
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };
  
  // Get impact color
  const getImpactColor = (impact?: string) => {
    if (!impact) return 'gray';
    switch (impact) {
      case 'critical': return 'red';
      case 'major': return 'orange';
      case 'moderate': return 'yellow';
      case 'minor': return 'blue';
      default: return 'gray';
    }
  };
  
  // Format confidence as percentage
  const formatConfidence = (confidence?: number) => {
    if (confidence === undefined) return '0%';
    return `${Math.round(confidence * 100)}%`;
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <Collapse in={isOpen}>
      <Paper withBorder p="md" mt="md">
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab 
              value="overview" 
              leftSection={<IconDeviceAnalytics size={16} />}
            >
              Error Analysis
            </Tabs.Tab>
            <Tabs.Tab 
              value="settings" 
              leftSection={<IconSettings size={16} />}
            >
              Prompt Settings
            </Tabs.Tab>
            {debugMode && (
              <Tabs.Tab 
                value="prompts" 
                leftSection={<IconBrain size={16} />}
              >
                Generated Prompts
              </Tabs.Tab>
            )}
          </Tabs.List>
          
          {/* Overview Tab */}
          <Tabs.Panel value="overview" pt="md">
            <Stack gap="md">
              {/* Error Categories */}
              <Card withBorder shadow="sm">
                <Stack gap="md">
                  <Group gap="xs">
                    <ThemeIcon size="md" variant="light" color={getCategoryColor(enhancedContext?.category)}>
                      <IconCategory size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Error Categorization</Text>
                  </Group>
                  
                  <Group gap="xs">
                    <Text size="sm" fw={500} w={120}>Base Category:</Text>
                    <Badge 
                      color={getCategoryColor(enhancedContext?.category)}
                      variant="filled"
                    >
                      {getCategoryDisplayName(enhancedContext?.category)}
                    </Badge>
                  </Group>
                  
                  {enhancedContext?.extendedCategory && (
                    <Group gap="xs">
                      <Text size="sm" fw={500} w={120}>Specific Type:</Text>
                      <Badge 
                        color={getCategoryColor(enhancedContext.extendedCategory)}
                        variant="outline"
                      >
                        {getCategoryDisplayName(enhancedContext.extendedCategory)}
                      </Badge>
                    </Group>
                  )}
                  
                  {enhancedContext?.subtype && (
                    <Group gap="xs">
                      <Text size="sm" fw={500} w={120}>Subtype:</Text>
                      <Badge color="gray" variant="dot">
                        {enhancedContext.subtype}
                      </Badge>
                    </Group>
                  )}
                </Stack>
              </Card>
              
              {/* Context Information */}
              <Card withBorder shadow="sm">
                <Stack gap="md">
                  <Group gap="xs">
                    <ThemeIcon size="md" variant="light" color="cyan">
                      <IconContext size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Contextual Information</Text>
                  </Group>
                  
                  <Group align="flex-start">
                    <Text size="sm" fw={500} w={120}>Confidence:</Text>
                    <Badge 
                      color={getConfidenceColor(enhancedContext?.confidenceScore)}
                      variant="dot"
                    >
                      {formatConfidence(enhancedContext?.confidenceScore)}
                    </Badge>
                  </Group>
                  
                  {enhancedContext?.severity && (
                    <Group align="flex-start">
                      <Text size="sm" fw={500} w={120}>Severity:</Text>
                      <Badge 
                        color={getSeverityColor(enhancedContext.severity)}
                        variant="filled"
                        size="sm"
                      >
                        {enhancedContext.severity}
                      </Badge>
                    </Group>
                  )}
                  
                  {enhancedContext?.predictedImpact && (
                    <Group align="flex-start">
                      <Text size="sm" fw={500} w={120}>Predicted Impact:</Text>
                      <Badge 
                        color={getImpactColor(enhancedContext.predictedImpact)}
                        variant="dot"
                      >
                        {enhancedContext.predictedImpact}
                      </Badge>
                    </Group>
                  )}
                  
                  {enhancedContext?.applicationContext && (
                    <Group align="flex-start">
                      <Text size="sm" fw={500} w={120}>App Context:</Text>
                      <Badge 
                        color={getContextColor(enhancedContext.applicationContext)}
                        variant="outline"
                      >
                        {getCategoryDisplayName(enhancedContext.applicationContext)}
                      </Badge>
                    </Group>
                  )}
                  
                  {enhancedContext?.runtimeContext && (
                    <Group align="flex-start">
                      <Text size="sm" fw={500} w={120}>Runtime Context:</Text>
                      <Badge color="gray" variant="outline">
                        {getCategoryDisplayName(enhancedContext.runtimeContext)}
                      </Badge>
                    </Group>
                  )}
                  
                  {enhancedContext?.isKnownIssue !== undefined && (
                    <Group align="flex-start">
                      <Text size="sm" fw={500} w={120}>Known Issue:</Text>
                      <Badge color={enhancedContext.isKnownIssue ? 'green' : 'gray'}>
                        {enhancedContext.isKnownIssue ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                  )}
                </Stack>
              </Card>
              
              {/* Root Cause Analysis */}
              {enhancedContext?.inferredRootCause && (
                <Card withBorder shadow="sm">
                  <Stack gap="md">
                    <Group gap="xs">
                      <ThemeIcon size="md" variant="light" color="orange">
                        <IconBulb size={16} />
                      </ThemeIcon>
                      <Text fw={600}>Root Cause Analysis</Text>
                    </Group>
                    
                    <Box>
                      <Text size="sm" fw={500} mb="xs">Inferred Root Cause:</Text>
                      <Text size="sm">{enhancedContext.inferredRootCause}</Text>
                    </Box>
                    
                    {enhancedContext.potentialCauses && enhancedContext.potentialCauses.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Potential Causes:</Text>
                        <Stack gap="xs">
                          {enhancedContext.potentialCauses.map((cause, index) => (
                            <Text size="sm" key={index}>• {cause}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Card>
              )}
              
              {/* Diagnostic Questions */}
              {enhancedContext?.diagnosticQuestions && enhancedContext.diagnosticQuestions.length > 0 && (
                <Card withBorder shadow="sm">
                  <Stack gap="md">
                    <Group gap="xs">
                      <ThemeIcon size="md" variant="light" color="yellow">
                        <IconZoomQuestion size={16} />
                      </ThemeIcon>
                      <Text fw={600}>Diagnostic Questions</Text>
                    </Group>
                    
                    <Stack gap="xs">
                      {enhancedContext.diagnosticQuestions.map((question, index) => (
                        <Group key={index} wrap="nowrap">
                          <ThemeIcon 
                            size="xs" 
                            variant="filled" 
                            radius="xl" 
                            color="yellow"
                          >
                            {index + 1}
                          </ThemeIcon>
                          <Text size="sm">{question}</Text>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              )}
              
              {/* Technical Details */}
              <Collapse in={debugMode}>
                <Card withBorder shadow="sm">
                  <Stack gap="md">
                    <Group gap="xs">
                      <ThemeIcon size="md" variant="light" color="grape">
                        <IconCode size={16} />
                      </ThemeIcon>
                      <Text fw={600}>Technical Details</Text>
                    </Group>
                    
                    {/* Code References */}
                    {enhancedContext?.codeReferences && enhancedContext.codeReferences.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Code References:</Text>
                        <Stack gap="xs">
                          {enhancedContext.codeReferences.map((ref, index) => (
                            <Badge 
                              key={index} 
                              color="gray" 
                              variant="outline"
                              style={{ fontFamily: 'monospace' }}
                            >
                              {ref}
                            </Badge>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    
                    {/* Stack Analysis */}
                    {enhancedContext?.stackAnalysis && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Stack Analysis:</Text>
                        <Stack gap="xs">
                          {enhancedContext.stackAnalysis.errorSource && (
                            <Group>
                              <Text size="sm" fw={500} w={80}>Source:</Text>
                              <Badge 
                                color="red" 
                                variant="dot"
                                style={{ fontFamily: 'monospace' }}
                              >
                                {enhancedContext.stackAnalysis.errorSource}
                              </Badge>
                            </Group>
                          )}
                          
                          {enhancedContext.stackAnalysis.library && (
                            <Group>
                              <Text size="sm" fw={500} w={80}>Library:</Text>
                              <Badge color="indigo" variant="outline">
                                {enhancedContext.stackAnalysis.library}
                              </Badge>
                            </Group>
                          )}
                        </Stack>
                      </Box>
                    )}
                    
                    {/* Related Error Types */}
                    {enhancedContext?.relatedErrorTypes && enhancedContext.relatedErrorTypes.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Related Error Types:</Text>
                        <Group gap="xs">
                          {enhancedContext.relatedErrorTypes.map((type, index) => (
                            <Badge key={index} color="blue" variant="outline">
                              {type}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                    
                    {/* Technical Context */}
                    {enhancedContext?.technicalContext && enhancedContext.technicalContext.length > 0 && (
                      <Box>
                        <Text size="sm" fw={500} mb="xs">Technical Context:</Text>
                        <Stack gap="xs">
                          {enhancedContext.technicalContext.map((ctx, index) => (
                            <Text size="sm" key={index}>• {ctx}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Card>
              </Collapse>
            </Stack>
          </Tabs.Panel>
          
          {/* Settings Tab */}
          <Tabs.Panel value="settings" pt="md">
            <Stack gap="md">
              <Card withBorder shadow="sm">
                <Stack gap="md">
                  <Group gap="xs">
                    <ThemeIcon size="md" variant="light" color="teal">
                      <IconAdjustments size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Prompt Engineering Settings</Text>
                  </Group>
                  
                  <Box>
                    <Text size="sm" fw={500} mb="md">Context-Aware Prompting Mode:</Text>
                    <Select
                      data={[
                        { value: PromptEngineeringLevel.ENHANCED, label: 'Enhanced' },
                        { value: PromptEngineeringLevel.BASIC, label: 'Basic' },
                        { value: PromptEngineeringLevel.DISABLED, label: 'Disabled' }
                      ]}
                      value={level}
                      onChange={(value) => setLevel(value as PromptEngineeringLevel)}
                      withinPortal
                      leftSection={
                        <IconBrain 
                          size={16} 
                          color={level === PromptEngineeringLevel.DISABLED ? theme.colors.gray[5] : theme.colors.teal[5]} 
                        />
                      }
                    />
                    
                    <Text size="xs" c="dimmed" mt="xs">
                      {level === PromptEngineeringLevel.ENHANCED
                        ? 'Enhanced: Advanced error analysis with specialized domain expertise tailored to error types.'
                        : level === PromptEngineeringLevel.BASIC
                          ? 'Basic: Simple error categorization with general prompts.'
                          : 'Disabled: No context-aware prompting, using default AI behavior.'}
                    </Text>
                  </Box>
                  
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Debug Mode:</Text>
                    <Switch
                      checked={debugMode}
                      onChange={toggleDebugMode}
                      labelPosition="left"
                      size="md"
                    />
                  </Group>
                  
                  <Text size="xs" c="dimmed">
                    Debug mode shows technical details and generated prompts.
                  </Text>
                </Stack>
              </Card>
              
              {!enhancedAvailable && (
                <Card withBorder shadow="sm" bg={theme.colors.red[0]}>
                  <Group gap="xs">
                    <ThemeIcon color="red" variant="light">
                      <IconInfoCircle size={16} />
                    </ThemeIcon>
                    <Text c="red">
                      Enhanced context analysis encountered an error. Falling back to basic mode.
                    </Text>
                  </Group>
                </Card>
              )}
              
              <Card withBorder shadow="sm">
                <Stack gap="md">
                  <Text size="sm">
                    Context-aware prompting analyzes errors and creates specialized prompts
                    to help the AI provide more relevant and actionable explanations.
                  </Text>
                  
                  <Group gap="xs">
                    <Table striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Feature</Table.Th>
                          <Table.Th>Basic</Table.Th>
                          <Table.Th>Enhanced</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>Error Categories</Table.Td>
                          <Table.Td>8</Table.Td>
                          <Table.Td>50+</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Domain-Specific Expertise</Table.Td>
                          <Table.Td>Limited</Table.Td>
                          <Table.Td>Comprehensive</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Stack Analysis</Table.Td>
                          <Table.Td>No</Table.Td>
                          <Table.Td>Yes</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Root Cause Analysis</Table.Td>
                          <Table.Td>No</Table.Td>
                          <Table.Td>Yes</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Application Context</Table.Td>
                          <Table.Td>No</Table.Td>
                          <Table.Td>Yes</Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>
          
          {/* Prompts Tab */}
          {debugMode && (
            <Tabs.Panel value="prompts" pt="md">
              <Stack gap="md">
                {/* System Prompt */}
                <Card withBorder shadow="sm">
                  <Stack gap="md">
                    <Group position="apart">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="blue">
                          <IconCodeCircle size={16} />
                        </ThemeIcon>
                        <Text fw={600}>System Prompt</Text>
                      </Group>
                      
                      <CopyButton value={systemPrompt || ''}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy'}>
                            <Button
                              color={copied ? 'teal' : 'blue'}
                              variant="subtle"
                              size="xs"
                              onClick={copy}
                              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            >
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    
                    <Box
                      p="xs"
                      style={{
                        fontFamily: 'monospace',
                        backgroundColor: theme.colors.gray[0],
                        borderRadius: theme.radius.sm,
                        whiteSpace: 'pre-wrap',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {systemPrompt || 'No system prompt generated'}
                    </Box>
                  </Stack>
                </Card>
                
                {/* User Prompt */}
                <Card withBorder shadow="sm">
                  <Stack gap="md">
                    <Group position="apart">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="green">
                          <IconStack2 size={16} />
                        </ThemeIcon>
                        <Text fw={600}>User Prompt</Text>
                      </Group>
                      
                      <CopyButton value={userPrompt || ''}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy'}>
                            <Button
                              color={copied ? 'teal' : 'green'}
                              variant="subtle"
                              size="xs"
                              onClick={copy}
                              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            >
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    
                    <Box
                      p="xs"
                      style={{
                        fontFamily: 'monospace',
                        backgroundColor: theme.colors.gray[0],
                        borderRadius: theme.radius.sm,
                        whiteSpace: 'pre-wrap',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {userPrompt || 'No user prompt generated'}
                    </Box>
                  </Stack>
                </Card>
                
                <Card withBorder shadow="sm" bg={theme.colors.blue[0]}>
                  <Group gap="xs">
                    <ThemeIcon color="blue" variant="light">
                      <IconInfoCircle size={16} />
                    </ThemeIcon>
                    <Text size="sm">
                      These prompts are sent to the AI model to guide its response.
                      The system prompt establishes the AI's expertise profile and approach, 
                      while the user prompt contains the specific error details and questions.
                    </Text>
                  </Group>
                </Card>
              </Stack>
            </Tabs.Panel>
          )}
        </Tabs>
      </Paper>
    </Collapse>
  );
};

export default ErrorContext;