// frontend/src/components/Feedback/FeedbackButtons.tsx

/**
 * Feedback buttons component for knowledge base issues.
 *
 * Allows users to provide feedback on AI explanations:
 * - Positive (thumbs up) - marks as helpful
 * - Negative (thumbs down) - marks as not helpful
 * - Correction - allows user to provide better solution
 *
 * Accessibility:
 * - All buttons have aria-labels
 * - Focus states are visible
 * - Keyboard navigation supported
 */

import { useState } from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Textarea,
  Modal,
  Button,
  Text,
  Stack,
  Badge,
} from '@mantine/core';
import {
  IconThumbUp,
  IconThumbDown,
  IconEdit,
  IconCheck,
} from '@tabler/icons-react';
import { useFeedback } from '../../api/unified/hooks/useKnowledgeBase';

export interface FeedbackButtonsProps {
  /** Database ID of the issue */
  issueId: number;
  /** Callback when feedback is successfully submitted */
  onFeedbackSubmitted?: (type: 'positive' | 'negative' | 'correction') => void;
  /** Show feedback stats badge */
  showStats?: boolean;
  /** Size of the buttons */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Orientation of buttons */
  orientation?: 'horizontal' | 'vertical';
}

export function FeedbackButtons({
  issueId,
  onFeedbackSubmitted,
  showStats = false,
  size = 'sm',
  orientation = 'horizontal',
}: FeedbackButtonsProps) {
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [submitted, setSubmitted] = useState<'positive' | 'negative' | 'correction' | null>(null);

  const {
    submitPositive,
    submitNegative,
    submitCorrection,
    stats,
    isSubmitting,
    isSuccess,
    reset,
  } = useFeedback(issueId);

  const handlePositive = async () => {
    submitPositive();
    setSubmitted('positive');
    onFeedbackSubmitted?.('positive');
  };

  const handleNegative = async () => {
    submitNegative();
    setSubmitted('negative');
    onFeedbackSubmitted?.('negative');
  };

  const handleCorrectionSubmit = async () => {
    if (!correctionText.trim()) return;

    submitCorrection(correctionText);
    setCorrectionOpen(false);
    setCorrectionText('');
    setSubmitted('correction');
    onFeedbackSubmitted?.('correction');
  };

  const handleReset = () => {
    setSubmitted(null);
    reset();
  };

  // Show success message after submission
  if (submitted && isSuccess) {
    return (
      <Group gap="xs">
        <Badge
          color={submitted === 'positive' ? 'green' : submitted === 'negative' ? 'orange' : 'blue'}
          leftSection={<IconCheck size={12} />}
          variant="light"
        >
          {submitted === 'positive' && 'Thanks for the feedback!'}
          {submitted === 'negative' && "We'll improve this."}
          {submitted === 'correction' && 'Correction saved!'}
        </Badge>
        <Button
          variant="subtle"
          size="compact-xs"
          onClick={handleReset}
          aria-label="Submit more feedback"
        >
          More
        </Button>
      </Group>
    );
  }

  const iconSize = size === 'xs' ? 14 : size === 'sm' ? 16 : size === 'md' ? 18 : 20;

  const buttons = (
    <>
      <Tooltip label="This was helpful" position="top">
        <ActionIcon
          variant="subtle"
          color="green"
          size={size}
          onClick={handlePositive}
          loading={isSubmitting && submitted === 'positive'}
          disabled={isSubmitting}
          aria-label="Mark as helpful"
        >
          <IconThumbUp size={iconSize} aria-hidden="true" />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="This was not helpful" position="top">
        <ActionIcon
          variant="subtle"
          color="red"
          size={size}
          onClick={handleNegative}
          loading={isSubmitting && submitted === 'negative'}
          disabled={isSubmitting}
          aria-label="Mark as not helpful"
        >
          <IconThumbDown size={iconSize} aria-hidden="true" />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Provide a correction" position="top">
        <ActionIcon
          variant="subtle"
          color="blue"
          size={size}
          onClick={() => setCorrectionOpen(true)}
          disabled={isSubmitting}
          aria-label="Provide a correction"
        >
          <IconEdit size={iconSize} aria-hidden="true" />
        </ActionIcon>
      </Tooltip>
    </>
  );

  return (
    <>
      <Group
        gap="xs"
        role="group"
        aria-label="Feedback options"
        style={orientation === 'vertical' ? { flexDirection: 'column' } : undefined}
      >
        {buttons}

        {showStats && stats && (
          <Text size="xs" c="dimmed" ml="xs">
            {stats.positive_count} helpful / {stats.negative_count} not helpful
          </Text>
        )}
      </Group>

      <Modal
        opened={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Provide a Correction"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Help improve our knowledge base by providing a better explanation or solution.
            Your correction will be reviewed and may be used to help others with similar issues.
          </Text>

          <Textarea
            id="correction-text"
            label="What's the correct solution?"
            placeholder="Describe the actual fix or a better explanation for this error..."
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            minRows={4}
            maxRows={10}
            autosize
            required
            aria-describedby="correction-help"
          />

          <Text id="correction-help" size="xs" c="dimmed">
            Be specific and include any relevant code examples, steps, or context
            that would help others understand and fix this issue.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setCorrectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCorrectionSubmit}
              loading={isSubmitting}
              disabled={!correctionText.trim() || correctionText.trim().length < 10}
              leftSection={<IconCheck size={16} />}
            >
              Submit Correction
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default FeedbackButtons;
