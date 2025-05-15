// frontend/src/components/DeadlockDisplay/EnhancedDeadlockDisplay.tsx

import React, { useState } from 'react';
import { 
  Paper, 
  Text, 
  Tabs, 
  Box,
  Group,
  Button,
  Badge,
  Skeleton,
  Divider,
  useMantineTheme,
  Collapse,
  Switch,
  Title,
  Alert,
  Modal,
  Tooltip
} from '@mantine/core';
import { 
  IconGraph, 
  IconList, 
  IconBulb, 
  IconAlertCircle,
  IconRefresh,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconClipboard,
  IconCheck,
  IconHistory,
  IconWand
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// Import our enhanced components
import EnhancedGraphView from './EnhancedGraphView';
import TableInfo from './TableInfo';
import RecommendationPanel from './RecommendationPanel';

// Import API functions from unified API client
import { api } from '../../api/unified';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';

// Define interfaces for props and data types
interface EventTag {
  key: string;
  value: string;
}

interface EventException {
  type?: string;
  value?: string;
}

interface EventExceptionContainer {
  values?: EventException[];
}

// @ts-ignore
interface EventEntry {
  type: string;
  data?: {
    values?: EventExceptionValue[];
  };
}

interface EventExceptionValue {
  value?: string;
}

interface EventDetails {
  message?: string;
  tags?: EventTag[];
  exception?: EventExceptionContainer;
  entries?: EventEntry[];
  projectId?: string;
  project?: {
    id?: string;
  };
  [key: string]: any; // For any additional fields
}

interface DeadlockMetadata {
  execution_time_ms: number;
  parser_version?: string;
  cycles_found: number;
}

interface DeadlockAnalysis {
  timestamp?: string;
  metadata?: DeadlockMetadata;
  visualization_data?: any;
  recommended_fix?: string;
}

interface DeadlockData {
  analysis?: DeadlockAnalysis;
  [key: string]: any; // For any additional fields
}

interface EnhancedDeadlockDisplayProps {
  eventId?: string;
  eventDetails?: EventDetails | null;
}

/**
 * Enhanced main component for PostgreSQL deadlock visualization and analysis
 */
const EnhancedDeadlockDisplay: React.FC<EnhancedDeadlockDisplayProps> = ({ eventId, eventDetails }) => {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [rawViewOpen, { toggle: toggleRawView }] = useDisclosure(false);
  const [historyModalOpened, { open: openHistoryModal, close: closeHistoryModal }] = useDisclosure(false);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Determine if this is a deadlock event
  const isDeadlockEvent = React.useMemo(() => {
    if (!eventDetails) return false;
    
    // Check for deadlock keywords in message or 40P01 error code
    const message = eventDetails.message || '';
    const hasDeadlockMessage = message.toLowerCase().includes('deadlock detected');
    
    // Check tags for error code
    const tags = eventDetails.tags || [];
    const hasDeadlockCode = tags.some(tag => 
      (tag.key === 'error_code' || tag.key === 'db_error_code' || tag.key === 'sql_state') && 
      tag.value === '40P01'
    );
    
    // Check exception values
    const exception = eventDetails.exception?.values?.[0] || {};
    const hasDeadlockException = 
      (exception.value?.toLowerCase()?.includes('deadlock detected')) || 
      (exception.type?.toLowerCase()?.includes('deadlock'));
    
    return hasDeadlockMessage || hasDeadlockCode || hasDeadlockException;
  }, [eventDetails]);
  
  // Extract a unique ID that combines eventId and project
  const uniqueId = React.useMemo(() => {
    if (!eventId) return null;
    const projectId = eventDetails?.projectId || eventDetails?.project?.id || '';
    return `${projectId}-${eventId}`;
  }, [eventId, eventDetails]);
  
  // Fetch deadlock analysis data
  const { 
    data: deadlockData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<DeadlockData>({
    queryKey: ['deadlockAnalysis', uniqueId, useEnhancedAnalysis], // Include enhancement flag in the key
    queryFn: () => api.analyzers.analyzeDeadlock(eventId as string, { 
      useEnhancedAnalysis,
      apiPath: useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers'
    }),
    enabled: !!uniqueId && isDeadlockEvent,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Copy recommendation to clipboard
  const handleCopyRecommendation = () => {
    if (deadlockData?.analysis?.recommended_fix) {
      navigator.clipboard.writeText(deadlockData.analysis.recommended_fix);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };
  
  // Export visualization as SVG
  const handleExportSVG = () => {
    // Get the SVG element
    const svgElement = document.querySelector('.deadlock-graph svg');
    if (svgElement && eventId) {
      api.analyzers.exportDeadlockSVG(eventId, svgElement as SVGElement);
      showSuccessNotification({
        title: 'SVG Exported',
        message: 'Deadlock visualization has been exported as SVG'
      });
    } else {
      showErrorNotification({
        title: 'Export Failed',
        message: 'Could not find SVG element to export'
      });
    }
  };
  
  // Toggle enhanced analysis
  const handleToggleEnhancedAnalysis = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseEnhancedAnalysis(event.currentTarget.checked);
  };
  
  // If not a deadlock event, show minimal UI
  if (!isDeadlockEvent) {
    return (
      <Paper withBorder p="md" radius="md">
        <Group justify="apart" mb="xs">
          <Text fw={600}>PostgreSQL Deadlock Analysis</Text>
          <Badge color="gray">Not Available</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          This event does not appear to be a PostgreSQL deadlock error (40P01).
          Deadlock visualization is only available for PostgreSQL deadlock events.
        </Text>
      </Paper>
    );
  }
  
  // If we're waiting for event data, show skeleton
  if (!eventDetails) {
    return (
      <Paper withBorder p="md" radius="md">
        <Skeleton height={25} width="50%" mb="md" />
        <Skeleton height={200} mb="md" />
        <Skeleton height={15} width="80%" mb="sm" />
        <Skeleton height={15} width="60%" mb="sm" />
        <Skeleton height={15} width="70%" />
      </Paper>
    );
  }
  
  // Format timestamp to relative time if available
  const formattedTimestamp = deadlockData?.analysis?.timestamp 
    ? formatDistanceToNow(new Date(deadlockData.analysis.timestamp), { addSuffix: true })
    : null;
  
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="apart" mb="md">
        <Group>
          <Text fw={600} size="lg">PostgreSQL Deadlock Analysis</Text>
          {isDeadlockEvent && (
            <Badge color="red">40P01</Badge>
          )}
          {formattedTimestamp && (
            <Tooltip 
              label="When this deadlock was analyzed" 
              position="bottom" 
              withArrow
            >
              <Badge color="gray" variant="outline">{formattedTimestamp}</Badge>
            </Tooltip>
          )}
        </Group>
        
        <Group gap="xs">
          <Switch
            size="xs"
            label="Enhanced Analysis"
            checked={useEnhancedAnalysis}
            onChange={handleToggleEnhancedAnalysis}
            onLabel={<IconWand size={12} />}
            offLabel={<IconWand size={12} color={theme.colors.gray[4]} />}
          />
          
          <Button 
            size="xs" 
            variant="light"
            leftSection={<IconRefresh size={14} />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
          
          <Button 
            size="xs" 
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={handleExportSVG}
            disabled={isLoading || isError}
          >
            Export SVG
          </Button>
          
          <Button
            size="xs"
            variant="light"
            leftSection={<IconHistory size={14} />}
            onClick={openHistoryModal}
            disabled
          >
            History
          </Button>
        </Group>
      </Group>
      
      {/* Analysis execution metadata */}
      {deadlockData?.analysis?.metadata && (
        <Box mb="md">
          <Group gap="xs" justify="right">
            <Text size="xs" c="dimmed">
              Analysis time: {deadlockData.analysis.metadata.execution_time_ms}ms
            </Text>
            <Text size="xs" c="dimmed">
              Parser: {deadlockData.analysis.metadata.parser_version || 'standard'}
            </Text>
            {deadlockData?.analysis?.metadata?.cycles_found > 0 && (
              <Badge size="xs" color="red" variant="light">
                {deadlockData.analysis.metadata.cycles_found} cycle{deadlockData.analysis.metadata.cycles_found !== 1 ? 's' : ''}
              </Badge>
            )}
          </Group>
        </Box>
      )}
      
      {isError ? (
        <Paper p="md" bg="rgba(255,0,0,0.05)" withBorder radius="md" mb="md">
          <Group gap="xs" mb="xs">
            <IconAlertCircle size={18} color={theme.colors.red[6]} />
            <Text fw={500}>Error Analyzing Deadlock</Text>
          </Group>
          <Text size="sm">
            An error occurred while analyzing the deadlock information: {(error as Error)?.message || 'Unknown error'}
          </Text>
          <Button 
            size="xs" 
            variant="light" 
            color="red" 
            mt="md"
            onClick={() => refetch()}
          >
            Retry Analysis
          </Button>
        </Paper>
      ) : (
        <>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || '')} mb="md">
            <Tabs.List>
              <Tabs.Tab 
                value="graph"
                leftSection={<IconGraph size={14} />}
              >
                Graph View
              </Tabs.Tab>
              
              <Tabs.Tab 
                value="tables"
                leftSection={<IconList size={14} />}
              >
                Lock Details
              </Tabs.Tab>
              
              <Tabs.Tab 
                value="recommendation"
                leftSection={<IconBulb size={14} />}
              >
                Recommendations
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
          
          {/* Tab Content */}
          <Box mb="md" className="deadlock-graph">
            {activeTab === 'graph' && (
              <EnhancedGraphView data={deadlockData?.analysis?.visualization_data} isLoading={isLoading} />
            )}
            
            {activeTab === 'tables' && (
              <TableInfo data={deadlockData?.analysis?.visualization_data} isLoading={isLoading} />
            )}
            
            {activeTab === 'recommendation' && (
              <Box>
                <Group justify="right" mb="sm">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={copySuccess ? <IconCheck size={14} /> : <IconClipboard size={14} />}
                    onClick={handleCopyRecommendation}
                    color={copySuccess ? 'green' : 'blue'}
                  >
                    {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                </Group>
                <RecommendationPanel 
                  data={{
                    processes: deadlockData?.analysis?.visualization_data?.processes || [],
                    relations: deadlockData?.analysis?.visualization_data?.relations || [],
                    deadlockChain: deadlockData?.analysis?.visualization_data?.deadlockChain || [],
                    pattern: deadlockData?.analysis?.visualization_data?.pattern,
                    recommendedFix: deadlockData?.analysis?.recommended_fix
                  }} 
                  isLoading={isLoading} 
                />
              </Box>
            )}
          </Box>
        </>
      )}
      
      {/* Raw view toggle */}
      <Divider mb="md" />
      <Button 
        variant="subtle" 
        rightSection={rawViewOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        onClick={toggleRawView}
        size="xs"
      >
        {rawViewOpen ? 'Hide raw deadlock data' : 'Show raw deadlock data'}
      </Button>
      
      <Collapse in={rawViewOpen}>
        <Paper withBorder p="md" radius="md" mt="md" bg={theme.colors.gray[0]}>
          <Text size="sm" fw={500} mb="xs">Raw Deadlock Message</Text>
          <Paper p="xs" withBorder radius="md" bg="white">
            <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
              {extractDeadlockMessage(eventDetails)}
            </Text>
          </Paper>
          
          {deadlockData && (
            <>
              <Text size="sm" fw={500} mt="md" mb="xs">Parsed Analysis Data</Text>
              <Paper p="xs" withBorder radius="md" bg="white" style={{ maxHeight: '200px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '11px' }}>
                  {JSON.stringify(deadlockData, null, 2)}
                </pre>
              </Paper>
            </>
          )}
        </Paper>
      </Collapse>
      
      {/* History Modal */}
      <Modal 
        opened={historyModalOpened} 
        onClose={closeHistoryModal}
        title={<Group><IconHistory size={16} /><Text>Deadlock History</Text></Group>}
        size="xl"
      >
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Title order={5}>Coming Soon</Title>
          <Text size="sm">
            The deadlock history feature will allow you to track deadlock trends over time,
            identifying recurring patterns and monitoring the effectiveness of your solutions.
          </Text>
        </Alert>
      </Modal>
    </Paper>
  );
};

/**
 * Extract the deadlock message from event details
 */
function extractDeadlockMessage(eventDetails: EventDetails): string {
  if (!eventDetails) return '';
  
  // Check in message field
  if (eventDetails.message && eventDetails.message.includes('deadlock detected')) {
    return eventDetails.message;
  }
  
  // Check in exception values
  const exceptionValues = eventDetails.exception?.values || [];
  for (const exception of exceptionValues) {
    if (exception.value && exception.value.includes('deadlock detected')) {
      return exception.value;
    }
  }
  
  // Check in entries
  const entries = eventDetails.entries || [];
  for (const entry of entries) {
    if (entry.type === 'exception') {
      const values = entry.data?.values || [];
      for (const value of values) {
        if (value.value && value.value.includes('deadlock detected')) {
          return value.value;
        }
      }
    }
  }
  
  // Fallback: return message or first exception value
  return eventDetails.message || 
         (exceptionValues[0]?.value || '') || 
         'No deadlock message found in event data';
}

export default EnhancedDeadlockDisplay;