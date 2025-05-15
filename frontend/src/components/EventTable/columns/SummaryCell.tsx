// File: src/components/EventTable/columns/SummaryCell.tsx

import React, { useEffect } from 'react';
import { 
  Text, 
  Group, 
  Stack, 
  Box, 
  Tooltip, 
  Badge, 
  Collapse, 
  Skeleton,
  Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronUp, IconBrain } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../api/unified';
import { utils } from '../../../api/unified';
import { SentryEvent } from '../../../types/deadlock';
import { EventType } from '../../../types/eventTypes';
import { extractErrorType, extractErrorMessage } from '../../../utils/eventUtils';
import { convertEventTypeToSentryEvent, ensureEventTagArray } from '../../../utils/typeGuards';
import TagCloud from '../TagCloud';

interface SummaryCellProps {
  event: SentryEvent | EventType;
  expanded?: boolean;
  onExpand?: (eventId: string) => void;
  showTags?: boolean;
  maxLines?: number;
}

/**
 * Summary cell for event tables with expandable details
 */
const SummaryCell: React.FC<SummaryCellProps> = ({
  event,
  expanded = false,
  onExpand,
  showTags = true,
  maxLines = 2
}) => {
  const [localExpanded, { toggle: toggleExpanded }] = useDisclosure(expanded);
  const [aiSummaryVisible, { toggle: toggleAiSummary }] = useDisclosure(false);
  
  // Check if event is already a SentryEvent or needs conversion
  const isSentryEvent = (e: SentryEvent | EventType): e is SentryEvent => {
    return 'project' in e && typeof (e as any).project === 'object';
  };
  
  // Convert event to SentryEvent format if needed for API functions
  const sentryEvent = isSentryEvent(event) ? event : convertEventTypeToSentryEvent(event as EventType);
  
  // Extract error details
  const errorType = extractErrorType(sentryEvent);
  const errorMessage = extractErrorMessage(sentryEvent);
  
  // When external expanded state changes, update local state
  useEffect(() => {
    if (expanded !== localExpanded) {
      if (expanded && onExpand) {
        onExpand(event.id);
      }
    }
  }, [expanded, localExpanded, event.id, onExpand]);
  
  // AI error summary mutation using unified API
  const aiSummaryMutation = useMutation({
    mutationFn: () => api.ai.explainError({
      eventData: event,
      errorType: errorType,
      errorMessage: errorMessage,
      summarizeOnly: true,
      model: 'default',
      maxTokens: 150
    }),
    onError: (error) => {
      utils.showErrorNotification({
        title: 'AI Summary Failed',
        error: error as Error
      });
    }
  });
  
  // Handle expand toggle
  const handleToggleExpand = () => {
    toggleExpanded();
    if (!localExpanded && onExpand) {
      onExpand(event.id);
    }
  };
  
  // Get AI summary
  const handleGetAiSummary = () => {
    if (!aiSummaryMutation.data && !aiSummaryMutation.isPending) {
      aiSummaryMutation.mutate();
    }
    toggleAiSummary();
  };
  
  return (
    <Box>
      <Group justify="apart" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {/* Error type */}
          <Group gap="xs" wrap="nowrap">
            <Tooltip label={errorType} position="top" disabled={errorType.length < 30}>
              <Text fw={500} truncate>
                {errorType}
              </Text>
            </Tooltip>
            {event.level && (
              <Badge size="sm" color={
                event.level === 'error' ? 'red' : 
                event.level === 'warning' ? 'yellow' : 
                event.level === 'info' ? 'blue' : 'gray'
              }>
                {event.level}
              </Badge>
            )}
          </Group>
          
          {/* Error message - collapsed or expanded */}
          <Collapse in={localExpanded} style={{ width: '100%' }}>
            <Text size="sm" my={4}>
              {errorMessage}
            </Text>
          </Collapse>
          
          {/* Error message - truncated preview when collapsed */}
          {!localExpanded && (
            <Text 
              size="sm" 
              lineClamp={maxLines}
              color="dimmed"
            >
              {errorMessage}
            </Text>
          )}
          
          {/* Show tags if enabled */}
          {showTags && event.tags && event.tags.length > 0 && (
            <Box mt={4}>
              <TagCloud tags={ensureEventTagArray(event.tags)} limit={localExpanded ? 0 : 3} />
            </Box>
          )}
          
          {/* AI summary section */}
          {localExpanded && (
            <Box mt={8}>
              <Group justify="apart">
                <Button 
                  size="xs" 
                  variant="light" 
                  leftSection={<IconBrain size={14} />}
                  onClick={handleGetAiSummary}
                  loading={aiSummaryMutation.isPending && !aiSummaryVisible}
                >
                  {aiSummaryVisible ? 'Hide AI Summary' : 'Get AI Summary'}
                </Button>
              </Group>
              
              <Collapse in={aiSummaryVisible}>
                <Box mt={8} pl={8} py={4} style={{ borderLeft: '2px solid #c1c2c5' }}>
                  {aiSummaryMutation.isPending ? (
                    <Stack>
                      <Skeleton height={16} width="90%" radius="xl" />
                      <Skeleton height={12} width="75%" radius="xl" />
                    </Stack>
                  ) : aiSummaryMutation.data ? (
                    <Text size="sm">
                      {aiSummaryMutation.data.explanation || 'No summary available'}
                    </Text>
                  ) : (
                    <Text size="sm" color="dimmed" fs="italic">
                      Click 'Get AI Summary' to generate an explanation
                    </Text>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </Stack>
        
        {/* Expand toggle button */}
        <Box onClick={handleToggleExpand} style={{ cursor: 'pointer' }}>
          {localExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </Box>
      </Group>
    </Box>
  );
};

export default SummaryCell;
