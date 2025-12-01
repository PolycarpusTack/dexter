/**
 * UnifiedTimeline Component
 *
 * Merges breadcrumbs and performance spans into a chronological timeline
 */

import { useMemo, useState } from 'react';
import {
  Timeline,
  Paper,
  Text,
  Group,
  Badge,
  Code,
  Stack,
  Tooltip,
  ActionIcon,
  Box,
  Button,
  Divider,
} from '@mantine/core';
import {
  IconClick,
  IconWorldWww,
  IconTerminal,
  IconAlertTriangle,
  IconClock,
  IconZoomIn,
  IconZoomOut,
  IconTarget,
} from '@tabler/icons-react';
import { Breadcrumb, PerformanceContext, TimelineEvent } from '../../types/enrichment';

interface UnifiedTimelineProps {
  breadcrumbs?: Breadcrumb[];
  performanceSpans?: PerformanceContext;
}

/**
 * Merge breadcrumbs and spans into chronological timeline events
 */
const mergeTimelineEvents = (
  breadcrumbs: Breadcrumb[] = [],
  performanceContext?: PerformanceContext
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  // Add breadcrumbs
  breadcrumbs.forEach((breadcrumb, index) => {
    events.push({
      id: `breadcrumb-${index}`,
      timestamp: breadcrumb.timestamp,
      type: 'breadcrumb',
      category: breadcrumb.type || breadcrumb.category || 'default',
      message: breadcrumb.message,
      data: breadcrumb.data,
      level: breadcrumb.level,
    });
  });

  // Add performance spans
  if (performanceContext) {
    const criticalPathSet = new Set(performanceContext.criticalPath || []);

    performanceContext.spans.forEach((span) => {
      events.push({
        id: `span-${span.spanId}`,
        timestamp: new Date(span.startTimestamp * 1000).toISOString(),
        type: 'span',
        category: span.op,
        message: span.description || span.op,
        duration: span.duration,
        data: span.data,
        isCriticalPath: criticalPathSet.has(span.spanId),
      });
    });
  }

  // Sort by timestamp
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Get icon for timeline event
 */
const getEventIcon = (event: TimelineEvent) => {
  const iconProps = { size: 16 };

  if (event.type === 'breadcrumb') {
    switch (event.category) {
      case 'navigation':
        return <IconWorldWww {...iconProps} />;
      case 'ui':
        return <IconClick {...iconProps} />;
      case 'console':
        return <IconTerminal {...iconProps} />;
      case 'error':
        return <IconAlertTriangle {...iconProps} />;
      default:
        return <IconClock {...iconProps} />;
    }
  } else {
    return <IconClock {...iconProps} />;
  }
};

/**
 * Get color for timeline event
 */
const getEventColor = (event: TimelineEvent): string => {
  if (event.isCriticalPath) return 'red';

  if (event.type === 'breadcrumb') {
    switch (event.category) {
      case 'navigation':
        return 'blue';
      case 'http':
        return 'grape';
      case 'ui':
        return 'cyan';
      case 'console':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  } else {
    // Span color based on duration
    if (event.duration && event.duration > 1000) return 'red';
    if (event.duration && event.duration > 500) return 'orange';
    return 'blue';
  }
};

/**
 * Format duration in human-readable format
 */
const formatDuration = (ms: number): string => {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

/**
 * Format timestamp relative to first event
 */
const formatRelativeTime = (timestamp: string, firstTimestamp: string): string => {
  const diff = new Date(timestamp).getTime() - new Date(firstTimestamp).getTime();
  return `+${formatDuration(diff)}`;
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  breadcrumbs,
  performanceSpans,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showOnlyCriticalPath, setShowOnlyCriticalPath] = useState(false);

  const events = useMemo(
    () => mergeTimelineEvents(breadcrumbs, performanceSpans),
    [breadcrumbs, performanceSpans]
  );

  const filteredEvents = useMemo(() => {
    if (!showOnlyCriticalPath) return events;
    return events.filter((e) => e.isCriticalPath || e.level === 'error');
  }, [events, showOnlyCriticalPath]);

  const firstTimestamp = events[0]?.timestamp;

  if (events.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" size="sm">
          No timeline events available. Breadcrumbs and performance spans will appear here.
        </Text>
      </Paper>
    );
  }

  const hasCriticalPath = events.some((e) => e.isCriticalPath);

  return (
    <Stack gap="md">
      {/* Controls */}
      <Group justify="space-between">
        <Group gap="xs">
          <Badge variant="light" size="sm">
            {filteredEvents.length} events
          </Badge>
          {hasCriticalPath && (
            <Badge variant="light" color="red" size="sm">
              Critical path detected
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          {hasCriticalPath && (
            <Button
              variant={showOnlyCriticalPath ? 'filled' : 'light'}
              size="xs"
              leftSection={<IconTarget size={14} />}
              onClick={() => setShowOnlyCriticalPath(!showOnlyCriticalPath)}
            >
              {showOnlyCriticalPath ? 'Show All' : 'Critical Path Only'}
            </Button>
          )}
        </Group>
      </Group>

      <Divider />

      {/* Timeline */}
      <Box style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <Timeline active={filteredEvents.length} bulletSize={24} lineWidth={2}>
          {filteredEvents.map((event, index) => (
            <Timeline.Item
              key={event.id}
              bullet={getEventIcon(event)}
              color={getEventColor(event)}
              title={
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {event.message || event.category}
                  </Text>
                  {event.isCriticalPath && (
                    <Badge size="xs" color="red" variant="filled">
                      Critical
                    </Badge>
                  )}
                </Group>
              }
            >
              <Stack gap="xs">
                {/* Metadata */}
                <Group gap="xs">
                  <Badge variant="dot" size="xs" color={getEventColor(event)}>
                    {event.type}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {event.category}
                  </Text>
                  {firstTimestamp && (
                    <Text size="xs" c="dimmed">
                      {formatRelativeTime(event.timestamp, firstTimestamp)}
                    </Text>
                  )}
                  {event.duration && (
                    <Badge size="xs" variant="light" color={event.duration > 1000 ? 'red' : 'blue'}>
                      {formatDuration(event.duration)}
                    </Badge>
                  )}
                </Group>

                {/* Event data */}
                {event.data && Object.keys(event.data).length > 0 && (
                  <Code
                    block
                    style={{
                      fontSize: '0.75em',
                      maxHeight: '100px',
                      overflowY: 'auto',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {JSON.stringify(event.data, null, 2)}
                  </Code>
                )}

                {/* Timestamp */}
                <Text size="xs" c="dimmed">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Text>
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      </Box>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Event Details</Text>
              <Button size="xs" variant="subtle" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </Group>
            <Code block style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selectedEvent, null, 2)}
            </Code>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default UnifiedTimeline;
