import React, { useState } from 'react';
import { 
  Modal, 
  Tabs, 
  Group, 
  Button, 
  Switch, 
  Badge, 
  Text, 
  Divider,
  useMantineTheme
} from '@mantine/core';
import { 
  IconGraph, 
  IconList, 
  IconBulb, 
  IconLock, 
  IconMaximize, 
  IconMinimize,
  IconRefresh,
  IconMask,
  IconDownload
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// Import components
import EnhancedGraphView from './EnhancedGraphView';
import TableInfo from './TableInfo';
import RecommendationPanel from './RecommendationPanel';
import SimpleErrorBoundary from '../ErrorHandling/SimpleErrorBoundary';

// Import hooks
import { useDataMasking, useAuditLog } from '../../hooks';

// Import API functions
import { enhancedDeadlockApi } from '../../api';
import errorHandling from '../../utils/errorHandling';

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

interface EventDetails {
  id: string;
  message?: string;
  tags?: EventTag[];
  exception?: EventExceptionContainer;
  [key: string]: any; // For any additional fields
}

interface DeadlockModalProps {
  eventId: string;
  eventDetails: EventDetails;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for PostgreSQL deadlock visualization and analysis
 */
const DeadlockModal: React.FC<DeadlockModalProps> = ({ 
  eventId, 
  eventDetails, 
  isOpen, 
  onClose 
}) => {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState<boolean>(true);
  
  // Custom hooks
  const { isMasked, toggleMasking, maskText } = useDataMasking({
    defaultMasked: true,
    patterns: {
      // Add custom patterns for SQL queries
      tableNames: /\b(FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z0-9_."]+)/gi,
      columnNames: /\b(SELECT|WHERE|GROUP BY|ORDER BY|HAVING)\s+([a-zA-Z0-9_,.()\s"]+)(\s+FROM|\s*$)/gi,
      values: /'[^']*'/g
    },
    replacements: {
      tableNames: (match, keyword, tableName) => `${keyword} [TABLE]`,
      columnNames: (match, keyword, columns, ending) => `${keyword} [COLUMNS]${ending}`,
      values: '[VALUE]'
    }
  });
  
  // Audit logging
  const logEvent = useAuditLog('DeadlockModal');
  
  // When the modal opens, log an event
  React.useEffect(() => {
    if (isOpen) {
      logEvent('opened', { eventId, hasEventDetails: !!eventDetails });
    }
  }, [isOpen, eventId, eventDetails, logEvent]);
  
  // Fetch deadlock analysis data
  const { 
    data: deadlockData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['deadlockAnalysis', eventId, useEnhancedAnalysis],
    queryFn: async () => {
      // Log the API call
      logEvent('fetch_analysis', { 
        eventId, 
        enhanced: useEnhancedAnalysis 
      });
      
      return enhancedDeadlockApi.analyzeDeadlock(eventId, { 
        useEnhancedAnalysis,
        apiPath: useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers'
      });
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value || 'graph');
    logEvent('tab_change', { tab: value });
  };
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    setFullscreen(!fullscreen);
    logEvent('toggle_fullscreen', { fullscreen: !fullscreen });
  };
  
  // Toggle enhanced analysis
  const handleToggleEnhancedAnalysis = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseEnhancedAnalysis(event.currentTarget.checked);
    logEvent('toggle_enhanced_analysis', { enhanced: event.currentTarget.checked });
  };
  
  // Toggle data masking
  const handleToggleDataMasking = () => {
    toggleMasking();
    logEvent('toggle_data_masking', { masked: !isMasked });
  };
  
  // Refresh analysis
  const handleRefresh = () => {
    refetch();
    logEvent('refresh_analysis', { eventId });
  };
  
  // Export visualization as SVG
  const handleExportSVG = () => {
    // Find SVG element in the DOM
    const svgElement = document.querySelector('.deadlock-graph svg');
    if (svgElement && eventId) {
      enhancedDeadlockApi.exportDeadlockSVG(eventId, svgElement as SVGElement);
      errorHandling.showSuccessNotification({
        title: 'SVG Exported',
        message: 'Deadlock visualization has been exported as SVG'
      });
      logEvent('export_svg', { eventId });
    } else {
      errorHandling.showErrorNotification({
        title: 'Export Failed',
        message: 'Could not find SVG element to export'
      });
      logEvent('export_svg_failed', { eventId, reason: 'SVG element not found' });
    }
  };
  
  // Format timestamp to relative time if available
  const formattedTimestamp = deadlockData?.analysis?.timestamp 
    ? formatDistanceToNow(new Date(deadlockData.analysis.timestamp), { addSuffix: true })
    : null;
  
  // Determine modal size based on fullscreen
  const modalSize = fullscreen ? 'calc(100vw - 40px)' : '90%';
  
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLock size={18} />
          <Text fw={600}>PostgreSQL Deadlock Analysis</Text>
          {deadlockData?.analysis?.metadata?.cycles_found > 0 && (
            <Badge color="red">
              {deadlockData.analysis.metadata.cycles_found} cycle{deadlockData.analysis.metadata.cycles_found !== 1 ? 's' : ''}
            </Badge>
          )}
          {formattedTimestamp && (
            <Badge color="gray" variant="outline">{formattedTimestamp}</Badge>
          )}
        </Group>
      }
      size={modalSize}
      fullScreen={fullscreen}
      classNames={{
        body: fullscreen ? 'flex-grow-1 d-flex flex-column' : ''
      }}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          ...(fullscreen && { height: 'calc(100vh - 120px)' })
        }
      }}
    >
      {/* Control bar */}
      <Group position="apart" mb="md">
        <Group>
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
            onChange={handleToggleDataMasking}
          />
        </Group>
        
        <Group gap="xs">
          <Button 
            size="xs" 
            variant="light"
            leftSection={<IconRefresh size={14} />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
          
          <Button 
            size="xs" 
            variant="light"
            leftSection={<IconMask size={14} />}
            onClick={handleToggleDataMasking}
          >
            {isMasked ? 'Show' : 'Mask'} Data
          </Button>
          
          <Button 
            size="xs" 
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={handleExportSVG}
            disabled={isLoading || isError || activeTab !== 'graph'}
          >
            Export SVG
          </Button>
          
          <Button 
            size="xs" 
            variant="light"
            leftSection={fullscreen ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
            onClick={handleFullscreenToggle}
          >
            {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </Group>
      </Group>
      
      {/* Analysis metadata */}
      {deadlockData?.analysis?.metadata && (
        <Group position="right" mb="md" spacing="xs">
          <Text size="xs" color="dimmed">
            Analysis time: {deadlockData.analysis.metadata.execution_time_ms}ms
          </Text>
          {deadlockData.analysis.metadata.parser_version && (
            <Text size="xs" color="dimmed">
              Parser: {deadlockData.analysis.metadata.parser_version}
            </Text>
          )}
        </Group>
      )}
      
      <Divider mb="md" />
      
      {/* Tabs */}
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
      
      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'graph' && (
          <SimpleErrorBoundary fallbackMessage="Error loading graph visualization">
            <EnhancedGraphView 
              data={deadlockData?.analysis?.visualization_data} 
              isLoading={isLoading} 
            />
          </SimpleErrorBoundary>
        )}
        
        {activeTab === 'tables' && (
          <SimpleErrorBoundary fallbackMessage="Error loading deadlock details">
            <TableInfo 
              data={deadlockData?.analysis?.visualization_data}
              isLoading={isLoading}
              isMasked={isMasked}
              maskText={maskText}
            />
          </SimpleErrorBoundary>
        )}
        
        {activeTab === 'recommendation' && (
          <SimpleErrorBoundary fallbackMessage="Error loading recommendations">
            <RecommendationPanel 
              data={{
                processes: deadlockData?.analysis?.visualization_data?.processes || [],
                relations: deadlockData?.analysis?.visualization_data?.relations || [],
                deadlockChain: deadlockData?.analysis?.visualization_data?.deadlockChain || [],
                pattern: deadlockData?.analysis?.visualization_data?.pattern,
                recommendedFix: deadlockData?.analysis?.recommended_fix
              }}
              isLoading={isLoading}
              isMasked={isMasked}
              maskText={maskText}
            />
          </SimpleErrorBoundary>
        )}
      </div>
    </Modal>
  );
};

export default DeadlockModal;
