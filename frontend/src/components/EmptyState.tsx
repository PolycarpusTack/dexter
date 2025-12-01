/**
 * EmptyState Component
 *
 * Polished empty state component for various scenarios throughout the application.
 * Enhanced for EPIC Q: AI Transparency & UX Polish - Story Q-4
 */

import { Button, Container, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAlertCircle,
  IconClock,
  IconDatabaseOff,
  IconSearch,
  IconShieldX,
} from '@tabler/icons-react';
import { ReactNode } from 'react';

export type EmptyStateType =
  | 'no-data'
  | 'no-results'
  | 'error'
  | 'timeout'
  | 'rate-limited'
  | 'permission-denied'
  | 'invalid-config';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EMPTY_STATE_CONFIGS: Record<
  EmptyStateType,
  { icon: typeof IconDatabaseOff; color: string }
> = {
  'no-data': { icon: IconDatabaseOff, color: 'gray' },
  'no-results': { icon: IconSearch, color: 'blue' },
  error: { icon: IconAlertCircle, color: 'red' },
  timeout: { icon: IconClock, color: 'orange' },
  'rate-limited': { icon: IconClock, color: 'yellow' },
  'permission-denied': { icon: IconShieldX, color: 'red' },
  'invalid-config': { icon: IconAlertCircle, color: 'orange' },
};

export function EmptyState({
  type = 'no-data',
  icon,
  title,
  description,
  action,
  actionLabel = 'Retry',
  onAction,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIGS[type];
  const IconComponent = config.icon;

  return (
    <Container size="sm" py="xl">
      <Stack spacing="lg" align="center" style={{ textAlign: 'center' }}>
        <ThemeIcon size={80} radius={80} variant="light" color={config.color}>
          {icon || <IconComponent size={40} aria-hidden="true" />}
        </ThemeIcon>

        <div>
          <Text size="lg" weight={600} mb={8}>
            {title}
          </Text>
          <Text size="sm" color="dimmed">
            {description}
          </Text>
        </div>

        {(action || onAction) && (
          <div>{action || (onAction && <Button onClick={onAction}>{actionLabel}</Button>)}</div>
        )}
      </Stack>
    </Container>
  );
}

/**
 * Pre-configured empty state variants for common scenarios
 */

export function NoEnrichmentData({ onEnrich }: { onEnrich?: () => void }) {
  return (
    <EmptyState
      type="no-data"
      title="No enrichment data available"
      description="This issue hasn't been enriched yet. Click 'Enrich Now' to fetch additional context from Sentry."
      action={
        onEnrich && (
          <Button onClick={onEnrich} variant="light">
            Enrich Now
          </Button>
        )
      }
    />
  );
}

export function NoSimilarIssues() {
  return (
    <EmptyState
      type="no-results"
      title="No similar issues found"
      description="We couldn't find any similar issues based on the error signature and context. This might be a new or unique error."
    />
  );
}

export function EnrichmentFailed({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      type="error"
      title="Enrichment failed"
      description={error || 'Failed to fetch enrichment data. Please try again.'}
      action={
        onRetry && (
          <Button onClick={onRetry} variant="light" color="red">
            Retry
          </Button>
        )
      }
    />
  );
}

export function APITimeout({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      type="timeout"
      title="Request timed out"
      description="The request took too long to complete. This might be due to high server load or network issues."
      action={
        onRetry && (
          <Button onClick={onRetry} variant="light" color="orange">
            Try Again
          </Button>
        )
      }
    />
  );
}

export function RateLimited({ retryAfter }: { retryAfter?: number }) {
  return (
    <EmptyState
      type="rate-limited"
      title="Rate limit exceeded"
      description={
        retryAfter
          ? `Too many requests. Please wait ${retryAfter} seconds before trying again.`
          : 'Too many requests. Please wait a moment before trying again.'
      }
    />
  );
}

export function PermissionDenied() {
  return (
    <EmptyState
      type="permission-denied"
      title="Permission denied"
      description="You don't have permission to access this resource. Please contact your administrator."
    />
  );
}

export function InvalidConfiguration({ message }: { message?: string }) {
  return (
    <EmptyState
      type="invalid-config"
      title="Invalid configuration"
      description={
        message ||
        'The application is not configured correctly. Please check your settings or contact support.'
      }
    />
  );
}
