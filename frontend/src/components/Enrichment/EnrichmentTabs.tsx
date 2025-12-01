/**
 * EnrichmentTabs Component
 *
 * Main tabbed interface for displaying all 11 enrichment data sources
 */

import { useState, useEffect } from 'react';
import {
  Tabs,
  Badge,
  Paper,
  Text,
  Stack,
  Group,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import {
  IconGitCommit,
  IconChartLine,
  IconFlame,
  IconVideo,
  IconBell,
  IconTags,
  IconRuler,
  IconUser,
  IconFootprint,
  IconPaperclip,
  IconNetwork,
} from '@tabler/icons-react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEnrichmentData } from '../../api/unified/hooks/useEnrichment';
import { SummaryPanel } from './SummaryPanel';
import { RAGContextDrawer } from './RAGContextDrawer';
import { UnifiedTimeline } from './UnifiedTimeline';
import { FreshnessPill } from './FreshnessPill';
import {
  EnrichmentData,
  ReleaseContext,
  SuspectCommit,
  PerformanceContext,
  ProfilingContext,
  SessionContext,
  ReplayMetadata,
  AlertContext,
  TagDistribution,
  OwnershipInfo,
  Measurements,
  GroupingInfo,
  AttachmentSummary,
} from '../../types/enrichment';

interface EnrichmentTabsProps {
  issueId: string | number;
}

/**
 * Tab panel for Releases & Commits
 */
const ReleasesCommitsPanel: React.FC<{ data?: ReleaseContext; commits?: SuspectCommit[] }> = ({
  data,
  commits,
}) => {
  if (!data && (!commits || commits.length === 0)) {
    return (
      <Text c="dimmed" size="sm">
        No release or commit information available.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {data && (
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={500}>Release: {data.version}</Text>
            {data.dateCreated && (
              <Text size="sm" c="dimmed">
                Created: {new Date(data.dateCreated).toLocaleString()}
              </Text>
            )}
            {data.newIssues !== undefined && (
              <Badge variant="light">{data.newIssues} new issues in this release</Badge>
            )}
          </Stack>
        </Paper>
      )}

      {commits && commits.length > 0 && (
        <Stack gap="sm">
          <Text fw={500}>Suspect Commits ({commits.length})</Text>
          {commits.map((commit) => (
            <Paper key={commit.id} p="md" withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {commit.message}
                  </Text>
                  <Badge color={commit.score > 70 ? 'red' : commit.score > 40 ? 'orange' : 'blue'}>
                    {commit.score}% suspect
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  by {commit.author.name} • {new Date(commit.dateCreated).toLocaleString()}
                </Text>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

/**
 * Tab panel for Performance
 */
const PerformancePanel: React.FC<{ data?: PerformanceContext }> = ({ data }) => {
  if (!data || data.spans.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No performance data available.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {data.nPlusOneDetected && data.nPlusOneDetails && (
        <Alert color="orange" title="N+1 Query Detected" icon={<IconAlertTriangle />}>
          <Text size="sm">
            Detected {data.nPlusOneDetails.count} repeated queries. This may indicate an N+1 query
            problem.
          </Text>
        </Alert>
      )}

      <Text fw={500}>Performance Spans ({data.spans.length})</Text>

      {data.slowSpans && data.slowSpans.length > 0 && (
        <Paper p="md" withBorder>
          <Text size="sm" fw={500} mb="sm">
            Slow Spans ({data.slowSpans.length})
          </Text>
          <Stack gap="xs">
            {data.slowSpans.slice(0, 5).map((span) => (
              <Group key={span.spanId} justify="space-between">
                <Text size="sm" lineClamp={1}>
                  {span.description || span.op}
                </Text>
                <Badge color="red">{span.duration.toFixed(0)}ms</Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
    <Text c="dimmed" size="sm">
      {message}
    </Text>
  </Paper>
);

export const EnrichmentTabs: React.FC<EnrichmentTabsProps> = ({ issueId }) => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [ragDrawerOpen, setRagDrawerOpen] = useState(false);

  const { data: enrichment, isLoading, error } = useEnrichmentData(issueId);

  // Keyboard shortcuts for tabs (1-9)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const tabIndex = parseInt(e.key, 10);
        const tabs = [
          'summary',
          'releases',
          'performance',
          'profiling',
          'sessions',
          'alerts',
          'tags',
          'measurements',
          'ownership',
          'timeline',
          'grouping',
        ];
        if (tabs[tabIndex - 1]) {
          setActiveTab(tabs[tabIndex - 1]);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <Paper p="xl" withBorder pos="relative" style={{ minHeight: '400px' }}>
        <LoadingOverlay visible />
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Error Loading Enrichment Data" icon={<IconAlertTriangle />}>
        <Text size="sm">{error.message || 'Failed to load enrichment data'}</Text>
      </Alert>
    );
  }

  // Count available data for badge indicators
  const counts = {
    commits: enrichment?.suspectCommits?.length || 0,
    spans: enrichment?.performanceSpans?.spans.length || 0,
    hotspots: enrichment?.profilingHotspots?.hotspots.length || 0,
    alerts: enrichment?.alertContext?.triggeredAlerts.length || 0,
    breadcrumbs: enrichment?.breadcrumbTimeline?.length || 0,
    tags: enrichment?.tagDistributions?.length || 0,
    measurements: (enrichment?.measurements?.custom?.length || 0) + (enrichment?.measurements?.webVitals ? 1 : 0),
    similarIssues: enrichment?.groupingInfo?.similarIssues.length || 0,
    attachments: enrichment?.attachmentsSummary?.length || 0,
  };

  return (
    <>
      <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value)}>
        <Tabs.List>
          <Tabs.Tab value="summary">
            Summary
          </Tabs.Tab>

          <Tabs.Tab
            value="releases"
            leftSection={<IconGitCommit size={14} />}
            rightSection={counts.commits > 0 ? <Badge size="xs">{counts.commits}</Badge> : null}
          >
            Releases & Commits
          </Tabs.Tab>

          <Tabs.Tab
            value="performance"
            leftSection={<IconChartLine size={14} />}
            rightSection={counts.spans > 0 ? <Badge size="xs">{counts.spans}</Badge> : null}
          >
            Performance
          </Tabs.Tab>

          <Tabs.Tab
            value="profiling"
            leftSection={<IconFlame size={14} />}
            rightSection={counts.hotspots > 0 ? <Badge size="xs">{counts.hotspots}</Badge> : null}
          >
            Profiling
          </Tabs.Tab>

          <Tabs.Tab value="sessions" leftSection={<IconVideo size={14} />}>
            Sessions & Replays
          </Tabs.Tab>

          <Tabs.Tab
            value="alerts"
            leftSection={<IconBell size={14} />}
            rightSection={counts.alerts > 0 ? <Badge size="xs">{counts.alerts}</Badge> : null}
          >
            Alerts & Incidents
          </Tabs.Tab>

          <Tabs.Tab
            value="tags"
            leftSection={<IconTags size={14} />}
            rightSection={counts.tags > 0 ? <Badge size="xs">{counts.tags}</Badge> : null}
          >
            Tags & Environment
          </Tabs.Tab>

          <Tabs.Tab
            value="measurements"
            leftSection={<IconRuler size={14} />}
            rightSection={counts.measurements > 0 ? <Badge size="xs">{counts.measurements}</Badge> : null}
          >
            Measurements
          </Tabs.Tab>

          <Tabs.Tab value="ownership" leftSection={<IconUser size={14} />}>
            Ownership
          </Tabs.Tab>

          <Tabs.Tab
            value="timeline"
            leftSection={<IconFootprint size={14} />}
            rightSection={counts.breadcrumbs > 0 ? <Badge size="xs">{counts.breadcrumbs}</Badge> : null}
          >
            Breadcrumbs
          </Tabs.Tab>

          <Tabs.Tab
            value="grouping"
            leftSection={<IconNetwork size={14} />}
            rightSection={counts.similarIssues > 0 ? <Badge size="xs">{counts.similarIssues}</Badge> : null}
          >
            Grouping
          </Tabs.Tab>

          <Tabs.Tab
            value="attachments"
            leftSection={<IconPaperclip size={14} />}
            rightSection={counts.attachments > 0 ? <Badge size="xs">{counts.attachments}</Badge> : null}
          >
            Attachments
          </Tabs.Tab>
        </Tabs.List>

        {/* Summary Tab */}
        <Tabs.Panel value="summary" pt="md">
          <SummaryPanel
            aiAnalysis={undefined} // TODO: Wire up from backend
            enrichment={enrichment}
            onWhyThisAnswer={() => setRagDrawerOpen(true)}
          />
        </Tabs.Panel>

        {/* Releases & Commits */}
        <Tabs.Panel value="releases" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Release Context & Suspect Commits</Text>
              {enrichment?.enrichmentStatus.release && (
                <FreshnessPill status={enrichment.enrichmentStatus.release} />
              )}
            </Group>
            <ReleasesCommitsPanel
              data={enrichment?.releaseContext}
              commits={enrichment?.suspectCommits}
            />
          </Stack>
        </Tabs.Panel>

        {/* Performance */}
        <Tabs.Panel value="performance" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Performance Spans</Text>
              {enrichment?.enrichmentStatus.performance && (
                <FreshnessPill status={enrichment.enrichmentStatus.performance} />
              )}
            </Group>
            <PerformancePanel data={enrichment?.performanceSpans} />
          </Stack>
        </Tabs.Panel>

        {/* Profiling */}
        <Tabs.Panel value="profiling" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Profiling Hotspots</Text>
              {enrichment?.enrichmentStatus.profiling && (
                <FreshnessPill status={enrichment.enrichmentStatus.profiling} />
              )}
            </Group>
            {enrichment?.profilingHotspots ? (
              <EmptyState message="Profiling data viewer coming soon" />
            ) : (
              <EmptyState message="No profiling data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Sessions & Replays */}
        <Tabs.Panel value="sessions" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Session Context & Replay</Text>
              {enrichment?.enrichmentStatus.session && (
                <FreshnessPill status={enrichment.enrichmentStatus.session} />
              )}
            </Group>
            {enrichment?.sessionContext || enrichment?.replayMetadata ? (
              <EmptyState message="Session/replay viewer coming soon" />
            ) : (
              <EmptyState message="No session or replay data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Alerts */}
        <Tabs.Panel value="alerts" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Alert History & Incidents</Text>
              {enrichment?.enrichmentStatus.alerts && (
                <FreshnessPill status={enrichment.enrichmentStatus.alerts} />
              )}
            </Group>
            {enrichment?.alertContext ? (
              <EmptyState message="Alert context viewer coming soon" />
            ) : (
              <EmptyState message="No alert data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Tags */}
        <Tabs.Panel value="tags" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Tag Distributions</Text>
              {enrichment?.enrichmentStatus.tags && (
                <FreshnessPill status={enrichment.enrichmentStatus.tags} />
              )}
            </Group>
            {enrichment?.tagDistributions ? (
              <EmptyState message="Tag distribution viewer coming soon" />
            ) : (
              <EmptyState message="No tag data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Measurements */}
        <Tabs.Panel value="measurements" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Web Vitals & Custom Metrics</Text>
              {enrichment?.enrichmentStatus.measurements && (
                <FreshnessPill status={enrichment.enrichmentStatus.measurements} />
              )}
            </Group>
            {enrichment?.measurements ? (
              <EmptyState message="Measurements viewer coming soon" />
            ) : (
              <EmptyState message="No measurements available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Ownership */}
        <Tabs.Panel value="ownership" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Ownership Information</Text>
              {enrichment?.enrichmentStatus.ownership && (
                <FreshnessPill status={enrichment.enrichmentStatus.ownership} />
              )}
            </Group>
            {enrichment?.ownershipInfo ? (
              <EmptyState message="Ownership viewer coming soon" />
            ) : (
              <EmptyState message="No ownership data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Timeline (Breadcrumbs) */}
        <Tabs.Panel value="timeline" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Unified Timeline</Text>
              {enrichment?.enrichmentStatus.breadcrumbs && (
                <FreshnessPill status={enrichment.enrichmentStatus.breadcrumbs} />
              )}
            </Group>
            <UnifiedTimeline
              breadcrumbs={enrichment?.breadcrumbTimeline}
              performanceSpans={enrichment?.performanceSpans}
            />
          </Stack>
        </Tabs.Panel>

        {/* Grouping */}
        <Tabs.Panel value="grouping" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Similar Issues & Grouping</Text>
              {enrichment?.enrichmentStatus.grouping && (
                <FreshnessPill status={enrichment.enrichmentStatus.grouping} />
              )}
            </Group>
            {enrichment?.groupingInfo ? (
              <EmptyState message="Grouping info viewer coming soon" />
            ) : (
              <EmptyState message="No grouping data available" />
            )}
          </Stack>
        </Tabs.Panel>

        {/* Attachments */}
        <Tabs.Panel value="attachments" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Attachments Summary</Text>
              {enrichment?.enrichmentStatus.attachments && (
                <FreshnessPill status={enrichment.enrichmentStatus.attachments} />
              )}
            </Group>
            {enrichment?.attachmentsSummary ? (
              <EmptyState message="Attachments viewer coming soon" />
            ) : (
              <EmptyState message="No attachments available" />
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* RAG Context Drawer */}
      <RAGContextDrawer
        opened={ragDrawerOpen}
        onClose={() => setRagDrawerOpen(false)}
        ragContext={undefined} // TODO: Wire up from aiAnalysis
      />
    </>
  );
};

export default EnrichmentTabs;
