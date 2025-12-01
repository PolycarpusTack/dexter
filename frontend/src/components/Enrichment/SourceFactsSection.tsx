/**
 * SourceFactsSection Component
 *
 * Displays factual source data without AI interpretation
 */

import { Paper, Title, Text, Group, Stack, Accordion, Code, Table } from '@mantine/core';
import { IconDatabase, IconClock } from '@tabler/icons-react';
import { EnrichmentData } from '../../types/enrichment';

interface SourceFactsSectionProps {
  enrichment?: EnrichmentData;
  highlightedSource?: string; // Highlight a specific source when navigating from citation
}

/**
 * Format source name for display
 */
const formatSourceName = (key: string): string => {
  const names: Record<string, string> = {
    releaseContext: 'Release Information',
    suspectCommits: 'Suspect Commits',
    performanceSpans: 'Performance Data',
    profilingHotspots: 'Profiling Hotspots',
    sessionContext: 'Session Context',
    replayMetadata: 'Session Replay',
    alertContext: 'Alert History',
    breadcrumbTimeline: 'Breadcrumbs',
    tagDistributions: 'Tag Distributions',
    ownershipInfo: 'Ownership',
    measurements: 'Measurements',
    groupingInfo: 'Grouping Info',
    attachmentsSummary: 'Attachments',
  };

  return names[key] || key;
};

/**
 * Render source data based on type
 */
const renderSourceData = (key: string, data: unknown): React.ReactNode => {
  if (!data) return <Text c="dimmed" size="sm">No data available</Text>;

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <Text c="dimmed" size="sm">No items found</Text>;
    }

    // For simple arrays
    if (typeof data[0] === 'string' || typeof data[0] === 'number') {
      return (
        <Stack gap="xs">
          {data.map((item, index) => (
            <Text key={index} size="sm">• {String(item)}</Text>
          ))}
        </Stack>
      );
    }

    // For object arrays, show as table or cards
    return (
      <Stack gap="md">
        {data.slice(0, 5).map((item, index) => (
          <Paper key={index} p="sm" withBorder>
            <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em' }}>
              {JSON.stringify(item, null, 2)}
            </Code>
          </Paper>
        ))}
        {data.length > 5 && (
          <Text size="xs" c="dimmed">
            ... and {data.length - 5} more items
          </Text>
        )}
      </Stack>
    );
  }

  // Handle objects
  if (typeof data === 'object') {
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return <Text c="dimmed" size="sm">No data available</Text>;
    }

    return (
      <Table striped highlightOnHover withTableBorder>
        <Table.Tbody>
          {entries.map(([k, v]) => (
            <Table.Tr key={k}>
              <Table.Td style={{ fontWeight: 500, width: '30%' }}>
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </Table.Td>
              <Table.Td>
                {typeof v === 'object' ? (
                  <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em' }}>
                    {JSON.stringify(v, null, 2)}
                  </Code>
                ) : (
                  <Text size="sm">{String(v)}</Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  // Primitive values
  return <Text size="sm">{String(data)}</Text>;
};

export const SourceFactsSection: React.FC<SourceFactsSectionProps> = ({
  enrichment,
  highlightedSource,
}) => {
  if (!enrichment) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" size="sm">
          No source data available.
        </Text>
      </Paper>
    );
  }

  // Filter out non-data fields
  const sourceDataKeys = Object.keys(enrichment).filter(
    (key) => !['enrichmentStatus', 'enrichedAt'].includes(key) && enrichment[key as keyof EnrichmentData]
  );

  if (sourceDataKeys.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" size="sm">
          No enrichment data available for this issue.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group gap="xs">
          <IconDatabase size={20} />
          <Title order={5}>Source Facts</Title>
        </Group>

        {/* Timestamp */}
        <Group gap="xs">
          <IconClock size={14} color="gray" />
          <Text size="xs" c="dimmed">
            Data collected: {new Date(enrichment.enrichedAt).toLocaleString()}
          </Text>
        </Group>

        {/* Accordion with all source data */}
        <Accordion variant="separated" defaultValue={highlightedSource}>
          {sourceDataKeys.map((key) => {
            const data = enrichment[key as keyof EnrichmentData];
            const isHighlighted = key === highlightedSource;

            return (
              <Accordion.Item
                key={key}
                value={key}
                style={isHighlighted ? { backgroundColor: '#fff3cd' } : undefined}
              >
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text fw={500}>{formatSourceName(key)}</Text>
                    {isHighlighted && (
                      <Text size="xs" c="blue">
                        Referenced by AI
                      </Text>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {renderSourceData(key, data)}
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Stack>
    </Paper>
  );
};

export default SourceFactsSection;
