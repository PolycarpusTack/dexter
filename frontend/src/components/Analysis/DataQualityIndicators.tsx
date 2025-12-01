/**
 * DataQualityIndicators Component
 *
 * Displays clear visual indicators for data quality issues including
 * staleness warnings and PII scrubbing information.
 *
 * EPIC Q: AI Transparency & UX Polish - Story Q-3
 */

import { ActionIcon, Alert, Badge, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle, IconRefresh, IconShieldLock } from '@tabler/icons-react';
import type { PIIScrubResult } from '../../types/analysis';
import { formatSourceName, isStale, isVeryStale } from '../../types/analysis';

interface DataQualityIndicatorsProps {
  enrichmentStatus: Record<string, { fetched_at?: string }>;
  piiScrubbed?: PIIScrubResult;
  onRefresh?: () => void;
}

export function DataQualityIndicators({
  enrichmentStatus,
  piiScrubbed,
  onRefresh,
}: DataQualityIndicatorsProps) {
  // Identify stale sources
  const staleSources = Object.entries(enrichmentStatus)
    .filter(([_, status]) => isStale(status.fetched_at))
    .map(([source]) => source);

  const veryStale = staleSources.filter(source => isVeryStale(enrichmentStatus[source]?.fetched_at));

  const hasStaleness = staleSources.length > 0;
  const hasPII = piiScrubbed?.pii_detected;

  // If nothing to show, don't render
  if (!hasStaleness && !hasPII) {
    return null;
  }

  return (
    <Stack spacing="xs">
      {/* Staleness Warning */}
      {hasStaleness && (
        <Alert
          color={veryStale.length > 0 ? 'red' : 'yellow'}
          icon={<IconAlertCircle size={16} aria-hidden="true" />}
          title={
            veryStale.length > 0 ? 'Some data is very outdated' : 'Some data may be outdated'
          }
          radius="md"
        >
          <Stack spacing="sm">
            <Text size="sm">
              {staleSources.length} enrichment source{staleSources.length > 1 ? 's' : ''}{' '}
              {veryStale.length > 0 ? 'are very old' : 'may be outdated'} and should be refreshed
              for the most accurate analysis.
            </Text>
            <Group spacing={8}>
              {staleSources.map(source => (
                <Badge
                  key={source}
                  color={veryStale.includes(source) ? 'red' : 'yellow'}
                  size="sm"
                  variant="light"
                >
                  {formatSourceName(source)}
                </Badge>
              ))}
            </Group>
            {onRefresh && (
              <Button
                variant="light"
                size="xs"
                leftIcon={<IconRefresh size={14} aria-hidden="true" />}
                onClick={onRefresh}
                aria-label="Refresh enrichment data"
              >
                Refresh Data
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      {/* PII Scrub Indicator */}
      {hasPII && piiScrubbed && (
        <Alert
          color="blue"
          icon={<IconShieldLock size={16} aria-hidden="true" />}
          radius="md"
        >
          <Group position="apart" noWrap>
            <div>
              <Text size="sm" weight={500}>
                Sensitive data was removed
              </Text>
              <Text size="xs" color="dimmed">
                {piiScrubbed.scrub_count} field{piiScrubbed.scrub_count > 1 ? 's' : ''} scrubbed
                for privacy protection
              </Text>
            </div>
            <Tooltip
              multiline
              width={300}
              withArrow
              label={
                <div>
                  <Text size="xs" weight={500} mb={4}>
                    Fields scrubbed:
                  </Text>
                  {piiScrubbed.fields_scrubbed.slice(0, 10).map(field => (
                    <Text key={field} size="xs">
                      • {field}
                    </Text>
                  ))}
                  {piiScrubbed.fields_scrubbed.length > 10 && (
                    <Text size="xs" color="dimmed" mt={4}>
                      ... and {piiScrubbed.fields_scrubbed.length - 10} more
                    </Text>
                  )}
                </div>
              }
            >
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label="View scrubbed fields details"
              >
                <IconInfoCircle size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Alert>
      )}
    </Stack>
  );
}
