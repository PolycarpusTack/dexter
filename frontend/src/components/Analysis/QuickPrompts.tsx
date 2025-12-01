/**
 * QuickPrompts Component
 *
 * Provides quick prompt shortcuts for different analysis focuses,
 * allowing users to re-analyze issues with specific perspectives.
 *
 * EPIC Q: AI Transparency & UX Polish - Story Q-2
 */

import { Button, Group, Text, Tooltip } from '@mantine/core';
import {
  IconArrowsJoin,
  IconGauge,
  IconListNumbers,
  IconSearch,
  IconUser,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import type { AnalysisResponse } from '../../types/analysis';
import { apiClient } from '../../api/unified/enhancedApiClient';

interface QuickPromptsProps {
  issueId: number;
  onAnalysisComplete: (analysis: AnalysisResponse) => void;
  compact?: boolean;
}

interface QuickPrompt {
  type: string;
  label: string;
  icon: typeof IconSearch;
  description: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    type: 'root_cause',
    label: 'Root Cause',
    icon: IconSearch,
    description: 'Analyze the fundamental cause of this error',
  },
  {
    type: 'performance_impact',
    label: 'Performance',
    icon: IconGauge,
    description: 'Focus on performance degradation and metrics',
  },
  {
    type: 'customer_explanation',
    label: 'For Customer',
    icon: IconUser,
    description: 'Non-technical explanation for customer communication',
  },
  {
    type: 'steps_to_reproduce',
    label: 'Reproduce',
    icon: IconListNumbers,
    description: 'Step-by-step reproduction instructions',
  },
  {
    type: 'similar_patterns',
    label: 'Patterns',
    icon: IconArrowsJoin,
    description: 'Identify patterns across similar issues',
  },
];

export function QuickPrompts({ issueId, onAnalysisComplete, compact = false }: QuickPromptsProps) {
  const analyzeWithPromptMutation = useMutation({
    mutationFn: async (promptType: string) => {
      const response = await apiClient.post<AnalysisResponse>('/ai-enhanced/analyze/quick-prompt', {
        issue_id: issueId,
        prompt_type: promptType,
      });
      return response.data;
    },
    onSuccess: data => {
      onAnalysisComplete(data);
    },
  });

  const handlePromptClick = (promptType: string) => {
    analyzeWithPromptMutation.mutate(promptType);
  };

  return (
    <div>
      {!compact && (
        <Group spacing="xs" mb="sm">
          <Text size="sm" weight={500} color="dimmed">
            Quick Analysis:
          </Text>
        </Group>
      )}
      <Group spacing="xs">
        {QUICK_PROMPTS.map(prompt => {
          const Icon = prompt.icon;
          return (
            <Tooltip key={prompt.type} label={prompt.description} withArrow position="top">
              <Button
                variant="light"
                size={compact ? 'xs' : 'sm'}
                leftIcon={<Icon size={16} aria-hidden="true" />}
                onClick={() => handlePromptClick(prompt.type)}
                loading={analyzeWithPromptMutation.isLoading}
                disabled={analyzeWithPromptMutation.isLoading}
                aria-label={`Analyze with ${prompt.label} focus: ${prompt.description}`}
              >
                {prompt.label}
              </Button>
            </Tooltip>
          );
        })}
      </Group>
    </div>
  );
}
