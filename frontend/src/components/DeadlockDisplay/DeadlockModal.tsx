// frontend/src/components/DeadlockDisplay/DeadlockModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Button, 
  Group, 
  Text, 
  Tabs, 
  ActionIcon, 
  Tooltip, 
  Switch,
  Paper,
  Divider,
  Box,
  Collapse
} from '@mantine/core';
import { 
  IconGraph, 
  IconList, 
  IconBulb, 
  IconRefresh,
  IconDownload,
  IconClipboard,
  IconCheck,
  IconHistory,
  IconMaximize,
  IconMinimize,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useClipboard } from '../../hooks/useClipboard';
import { useDataMasking } from '../../hooks/useDataMasking';
import { useAuditLog } from '../../hooks/useAuditLog';

// Import visualization components
import EnhancedGraphView from './EnhancedGraphView';
import TableInfo from './TableInfo';
import RecommendationPanel from './RecommendationPanel';

// Import API functions
import { analyzeDeadlock, exportDeadlockSVG } from '../../api/enhancedDeadlockApi';
import { useQuery } from '@tanstack/react-query';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';

// Import error boundary component (assuming it exists)
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';

// Import types
import { SentryEvent, DeadlockAnalysisResponse } from '../../types/deadlock';

// Import schema validation
import { safeValidateDeadlockAnalysisResponse } from '../../schemas/deadlockSchemas';

// Import fallback components for error boundaries
const GraphErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Paper p="md" withBorder>
    <Text color="red" mb="md">Failed to render graph visualization</Text>
    <Text size="sm" mb="md">{error.message}</Text>
    <Button size="sm" onClick={resetErrorBoundary}>Try Again</Button>
  </Paper>
);

const TableErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Paper p="md" withBorder>
    <Text color="red" mb="md">Failed to render table information</Text>
    <Text size="sm" mb="md">{error.message}</Text>
    <Button size="sm" onClick={resetErrorBoundary}>Try Again</Button>
  </Paper>
);

const RecommendationErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Paper p="md" withBorder>
    <Text color="red" mb="md">Failed to render recommendations</Text>
    <Text size="sm" mb="md">{error.message}</Text>
    <Button size="sm" onClick={resetErrorBoundary}>Try Again</Button>
  </Paper>
);

interface DeadlockModalProps {
  eventId: string;
  eventDetails: SentryEvent;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for PostgreSQL deadlock visualization and analysis
 * 
 * This component displays deadlock information in a modal with tabs for
 * different visualization types.
 */
const DeadlockModal: React.FC<DeadlockModalProps> = ({ 
  eventId, 
  eventDetails, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [rawViewOpen, { toggle: toggleRawView }] = useDisclosure(false);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState<boolean>(true);
  
  // Custom hooks
  const { isCopied, copyToClipboard } = useClipboard();
  const { isMasked, toggleMasking, maskText } = useDataMasking({ defaultMasked: true });
  const logEvent = useAuditLog('DeadlockModal');
  
  // Log opening of modal
  useEffect(() => {
    if (isOpen) {
      logEvent('open_deadlock_modal', { eventId });
    }
  }, [isOpen, eventId, logEvent]);
  
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
  } = useQuery({
    queryKey: ['deadlockAnalysis', uniqueId, useEnhancedAnalysis], 
    queryFn: async () => {
      const response = await analyzeDeadlock(eventId, { 
        useEnhancedAnalysis,
        apiPath: useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers'
      });
      
      // Validate the response with Zod schema
      return safeValidateDeadlockAnalysisResponse(response);
    },
    enabled: !!uniqueId && isOpen, // Only fetch when modal is open
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logEvent('change_tab', { tab: value, eventId });
  };
  
  // Export visualization as SVG
  const handleExportSVG = useCallback(() => {
    try {
      // Get the SVG element
      const svgElement = document.querySelector('.deadlock-graph svg');
      if (svgElement) {
        exportDeadlockSVG(eventId, svgElement as SVGElement);
        showSuccessNotification({
          title: 'SVG Exported',
          message: 'Deadlock visualization has been exported as SVG'
        });
        logEvent('export_svg', { eventId });
      } else {
        showErrorNotification({
          title: 'Export Failed',
          message: 'Could not find SVG element to export'
        });
      }
    } catch (error) {
      console.error('Error exporting SVG:', error);
      showErrorNotification({
        title: 'Export Failed',
        message: `Error: ${(error as Error).message || 'Unknown error'}`
      });
    }
  }, [eventId, logEvent]);
  
  // Copy recommendation to clipboard
  const handleCopyRecommendation = useCallback(() => {
    if (deadlockData?.analysis?.recommended_fix) {
      const recommendation = maskText(deadlockData.analysis.recommended_fix);
      copyToClipboard(recommendation, {
        successMessage: 'Recommendation copied to clipboard',
        showNotification: true
      });
      logEvent('copy_recommendation', { eventId });
    }
  }, [deadlockData, maskText, copyToClipboard, eventId, logEvent]);
  
  // Toggle enhanced analysis
  const handleToggleEnhancedAnalysis = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseEnhancedAnalysis(event.currentTarget.checked);
    logEvent('toggle_enhanced_analysis', { 
      eventId, 
      enabled: event.currentTarget.checked 
    });
  };
  
  // Toggle full screen
  const handleToggleFullScreen = useCallback(() => {
    setFullScreen(prev => !prev);
    logEvent('toggle_fullscreen', { eventId, fullScreen: !fullScreen });
  }, [fullScreen, eventId, logEvent]);
  
  // Modal size based on fullScreen state
  const modalSize = fullScreen ? 'calc(100vw - 40px)' : 'xl';
  
  // Extract deadlock message
  const deadlockMessage = extractDeadlockMessage(eventDetails);
  
  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        logEvent('close_deadlock_modal', { eventId });
        onClose();
      }}
      title={
        <Group>
          <Text fw={600}>PostgreSQL Deadlock Analysis</Text>
          <Text c="dimmed" size="sm">Event: {eventId}</Text>
        </Group>
      }
      size={modalSize}
      fullScreen={fullScreen}
      trapFocus
      zIndex={1000}
      styles={{
        body: {
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingBottom: '1rem'
        }
      }}
    >
      {/* Controls */}
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <Switch
            size="xs"
            label="Enhanced Analysis"
            checked={useEnhancedAnalysis}
            onChange={handleToggleEnhancedAnalysis}
          />
          
          <Switch
            size="xs"
            label="Mask Sensitive Data"
            checked={isMasked}
            onChange={() => {
              toggleMasking();
              logEvent('toggle_masking', { eventId, masked: !isMasked });
            }}
            thumbIcon={isMasked ? <IconEyeOff size={12} /> : <IconEye size={12} />}
          />
        </Group>
        
        <Group spacing="xs">
          <Tooltip label="Refresh Analysis">
            <ActionIcon 
              onClick={() => {
                refetch();
                logEvent('refresh_analysis', { eventId });
              }}
              loading={isLoading}
              variant="light"
              aria-label="Refresh Analysis"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Export as SVG">
            <ActionIcon
              onClick={handleExportSVG}
              disabled={isLoading || isError}
              variant="light"
              aria-label="Export as SVG"
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label={fullScreen ? "Exit Full Screen" : "Full Screen"}>
            <ActionIcon 
              onClick={handleToggleFullScreen} 
              variant="light"
              aria-label={fullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {fullScreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      
      {/* Analysis metadata */}
      {deadlockData?.analysis?.metadata && (
        <Group spacing="xs" position="right" mb="xs">
          <Text size="xs" c="dimmed">
            Analysis time: {deadlockData.analysis.metadata.execution_time_ms}ms
          </Text>
          <Text size="xs" c="dimmed">
            Parser: {deadlockData.analysis.metadata.parser_version || 'standard'}
          </Text>
        </Group>
      )}
      
      {/* Tabs and content */}
      <Tabs value={activeTab} onChange={handleTabChange} mb="md">
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
      <Box 
        mb="md" 
        className="deadlock-graph" 
        style={{ minHeight: '400px' }}
      >
        {activeTab === 'graph' && (
          <ErrorBoundary
            FallbackComponent={GraphErrorFallback}
            onReset={() => {
              // Reset error state and try again
              refetch();
              logEvent('reset_error', { component: 'graph', eventId });
            }}
          >
            <EnhancedGraphView 
              data={deadlockData?.analysis?.visualization_data} 
              isLoading={isLoading} 
            />
          </ErrorBoundary>
        )}
        
        {activeTab === 'tables' && (
          <ErrorBoundary
            FallbackComponent={TableErrorFallback}
            onReset={() => {
              refetch();
              logEvent('reset_error', { component: 'tables', eventId });
            }}
          >
            <TableInfo 
              data={deadlockData?.analysis?.visualization_data} 
              isLoading={isLoading}
              maskText={maskText}
              isMasked={isMasked}
            />
          </ErrorBoundary>
        )}
        
        {activeTab === 'recommendation' && (
          <ErrorBoundary
            FallbackComponent={RecommendationErrorFallback}
            onReset={() => {
              refetch();
              logEvent('reset_error', { component: 'recommendation', eventId });
            }}
          >
            <Box>
              <Group position="right" mb="sm">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={isCopied ? <IconCheck size={14} /> : <IconClipboard size={14} />}
                  onClick={handleCopyRecommendation}
                  color={isCopied ? 'green' : 'blue'}
                >
                  {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              </Group>
              <RecommendationPanel 
                data={{
                  ...deadlockData?.analysis?.visualization_data,
                  recommendedFix: maskText(deadlockData?.analysis?.recommended_fix)
                }} 
                isLoading={isLoading}
                isMasked={isMasked}
              />
            </Box>
          </ErrorBoundary>
        )}
      </Box>
      
      {/* Raw data view */}
      <Divider mb="xs" />
      <Button 
        variant="subtle" 
        rightSection={rawViewOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        onClick={() => {
          toggleRawView();
          logEvent('toggle_raw_view', { eventId, open: !rawViewOpen });
        }}
        size="xs"
      >
        {rawViewOpen ? 'Hide raw deadlock data' : 'Show raw deadlock data'}
      </Button>
      
      <Collapse in={rawViewOpen}>
        <Paper withBorder p="md" radius="md" mt="md" bg="#f9f9f9">
          <Text size="sm" fw={500} mb="xs">Raw Deadlock Message</Text>
          <Paper p="xs" withBorder radius="md" bg="white">
            <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
              {isMasked ? maskText(deadlockMessage) : deadlockMessage}
            </Text>
          </Paper>
          
          {deadlockData && (
            <>
              <Text size="sm" fw={500} mt="md" mb="xs">Parsed Analysis Data</Text>
              <Paper p="xs" withBorder radius="md" bg="white" style={{ maxHeight: '200px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '11px' }}>
                  {isMasked 
                    ? maskText(JSON.stringify(deadlockData, null, 2))
                    : JSON.stringify(deadlockData, null, 2)
                  }
                </pre>
              </Paper>
            </>
          )}
        </Paper>
      </Collapse>
    </Modal>
  );
};

/**
 * Extract the deadlock message from event details
 */
function extractDeadlockMessage(eventDetails: SentryEvent): string {
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

export default DeadlockModal;
