/**
 * FreshnessPill Component
 *
 * Displays data freshness with color-coded pills and refresh action
 */

import { Badge, ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconCheck, IconClock } from '@tabler/icons-react';
import { FreshnessLevel, EnrichmentSourceStatus } from '../../types/enrichment';

interface FreshnessPillProps {
  status: EnrichmentSourceStatus;
  onRefresh?: () => void;
  ttl?: number; // Time to live in seconds (default: 30 min)
}

/**
 * Calculate freshness level based on fetchedAt timestamp and TTL
 */
const calculateFreshness = (
  status: EnrichmentSourceStatus,
  ttl: number = 1800 // Default 30 minutes
): FreshnessLevel => {
  if (!status.success) {
    return FreshnessLevel.FAILED;
  }

  if (!status.fetchedAt) {
    return FreshnessLevel.VERY_STALE;
  }

  const fetchedAt = new Date(status.fetchedAt).getTime();
  const now = Date.now();
  const ageSeconds = (now - fetchedAt) / 1000;

  if (ageSeconds < 300) {
    return FreshnessLevel.FRESH; // < 5 min
  } else if (ageSeconds < 1800) {
    return FreshnessLevel.RECENT; // 5-30 min
  } else if (ageSeconds < ttl) {
    return FreshnessLevel.STALE; // 30 min - TTL
  } else {
    return FreshnessLevel.VERY_STALE; // > TTL
  }
};

/**
 * Format age in human-readable format
 */
const formatAge = (fetchedAt: string): string => {
  const ageSeconds = (Date.now() - new Date(fetchedAt).getTime()) / 1000;

  if (ageSeconds < 60) {
    return `${Math.floor(ageSeconds)}s ago`;
  } else if (ageSeconds < 3600) {
    return `${Math.floor(ageSeconds / 60)}m ago`;
  } else if (ageSeconds < 86400) {
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(ageSeconds / 86400)}d ago`;
  }
};

/**
 * Get badge color based on freshness level
 */
const getBadgeColor = (level: FreshnessLevel): string => {
  switch (level) {
    case FreshnessLevel.FRESH:
      return 'green';
    case FreshnessLevel.RECENT:
      return 'blue';
    case FreshnessLevel.STALE:
      return 'yellow';
    case FreshnessLevel.VERY_STALE:
      return 'orange';
    case FreshnessLevel.FAILED:
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Get icon for freshness level
 */
const getFreshnessIcon = (level: FreshnessLevel) => {
  const iconProps = { size: 14 };

  switch (level) {
    case FreshnessLevel.FRESH:
      return <IconCheck {...iconProps} />;
    case FreshnessLevel.RECENT:
      return <IconClock {...iconProps} />;
    case FreshnessLevel.STALE:
      return <IconClock {...iconProps} />;
    case FreshnessLevel.VERY_STALE:
      return <IconAlertTriangle {...iconProps} />;
    case FreshnessLevel.FAILED:
      return <IconAlertTriangle {...iconProps} />;
    default:
      return null;
  }
};

/**
 * Get human-readable label
 */
const getFreshnessLabel = (level: FreshnessLevel, status: EnrichmentSourceStatus): string => {
  if (level === FreshnessLevel.FAILED) {
    return status.error || 'Failed to fetch';
  }

  if (!status.fetchedAt) {
    return 'No data';
  }

  return formatAge(status.fetchedAt);
};

export const FreshnessPill: React.FC<FreshnessPillProps> = ({
  status,
  onRefresh,
  ttl,
}) => {
  const freshnessLevel = calculateFreshness(status, ttl);
  const badgeColor = getBadgeColor(freshnessLevel);
  const icon = getFreshnessIcon(freshnessLevel);
  const label = getFreshnessLabel(freshnessLevel, status);

  const tooltipMessage =
    freshnessLevel === FreshnessLevel.FAILED
      ? `Error: ${status.error || 'Unknown error'}`
      : freshnessLevel === FreshnessLevel.VERY_STALE
      ? 'Data is very stale. Consider refreshing.'
      : freshnessLevel === FreshnessLevel.STALE
      ? 'Data is slightly stale but still valid.'
      : status.fetchedAt
      ? `Last updated: ${new Date(status.fetchedAt).toLocaleString()}`
      : 'No timestamp available';

  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip label={tooltipMessage} withArrow>
        <Badge
          color={badgeColor}
          variant="light"
          leftSection={icon}
          size="sm"
          style={{ cursor: 'help' }}
        >
          {label}
        </Badge>
      </Tooltip>

      {onRefresh && (freshnessLevel === FreshnessLevel.STALE || freshnessLevel === FreshnessLevel.VERY_STALE || freshnessLevel === FreshnessLevel.FAILED) && (
        <Tooltip label="Refresh data" withArrow>
          <ActionIcon
            size="sm"
            variant="subtle"
            color={badgeColor}
            onClick={onRefresh}
            aria-label="Refresh enrichment data"
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
};

export default FreshnessPill;
