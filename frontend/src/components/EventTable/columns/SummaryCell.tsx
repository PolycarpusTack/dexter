// File: src/components/EventTable/columns/SummaryCell.tsx

import React, { useState, useEffect } from 'react';
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
import { explainError } from '../../../api/aiApi';
import { showErrorNotification } from '../../../utils/errorHandling';
import { SentryEvent } from '../../../types/deadlock';
import { extractErrorType, extractErrorMessage } from '../../../utils/eventUtils';
import TagCloud from '../TagCloud';

interface SummaryCellProps {
  event: SentryEvent;
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
  
  // Extract error details
  const errorType = extractErrorType(event);
  const errorMessage = extractErrorMessage(event);
  
  // When external expanded state changes, update local state
  useEffect(() => {
    if (expanded !== localExpanded) {
      if (expanded && onExpand) {
        onExpand(event.id);
      }
    }
  }, [expanded, localExpanded, event.id, onExpand]);
  
  // AI error summary mutation
  const aiSummaryMutation = useMutation({
    mutationFn: () => explainError({ 
      event_data: event,
      error_type: errorType,
      error_message: errorMessage,
      summarize_only: true
    }),
    onError: (error) => {
      showErrorNotification({
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
      <Group position="apart" noWrap>
        <Stack spacing={2} style={{ flex: 1, minWidth: 0 }}>
          {/* Error type */}
          <Text fw={500} truncate>
            {errorType}
          </Text>
          
          {/* Error message - collapsed or expanded */}
          <Collapse in={localExpanded} sx={{ width: '100%' }}>
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
              <TagCloud tags={event.tags} limit={localExpanded ? 0 : 3} />
            </Box>
          )}
          
          {/* AI summary section */}
          {localExpanded && (
            <Box mt={8}>
              <Group position="apart">
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
                    <Text size="sm" color="dimmed" italic>
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
