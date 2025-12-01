/**
 * WhyThisAnswer Component
 *
 * Displays comprehensive transparency information about AI analysis,
 * showing users WHY the AI gave a specific answer.
 *
 * EPIC Q: AI Transparency & UX Polish - Story Q-1
 */

import {
  Alert,
  Badge,
  Card,
  Grid,
  Group,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBrain,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDatabase,
  IconSearch,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { TransparencyInfo } from '../../types/analysis';
import { formatSourceName, getConfidenceColor, getConfidenceLevel } from '../../types/analysis';

interface WhyThisAnswerProps {
  transparency: TransparencyInfo;
  confidence: number;
}

export function WhyThisAnswer({ transparency, confidence }: WhyThisAnswerProps) {
  const navigate = useNavigate();
  const confidenceLevel = getConfidenceLevel(confidence);
  const confidenceColor = getConfidenceColor(confidence);
  const confidencePercent = Math.round(confidence * 100);

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Stack spacing="md">
        {/* Header */}
        <Group position="apart">
          <Group spacing="xs">
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconBrain size={20} />
            </ThemeIcon>
            <Title order={4}>Why This Answer?</Title>
          </Group>
        </Group>

        {/* Confidence Section */}
        <Card withBorder p="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Stack spacing="sm">
            <Group position="apart">
              <Text weight={600} size="sm">
                Confidence Level
              </Text>
              <Badge color={confidenceColor} size="lg" variant="filled">
                {confidencePercent}% {confidenceLevel.toUpperCase()}
              </Badge>
            </Group>
            <Progress
              value={confidencePercent}
              color={confidenceColor}
              size="lg"
              radius="xl"
              aria-label={`Confidence level: ${confidencePercent}%`}
            />
            <Text size="sm" color="dimmed">
              {transparency.confidence_factors.reasoning}
            </Text>

            {/* Confidence Breakdown */}
            <Grid gutter="xs" mt="xs">
              <Grid.Col span={4}>
                <Stack spacing={4} align="center">
                  <Text size="xs" color="dimmed">
                    High Similarity
                  </Text>
                  <Text weight={600} size="lg">
                    {transparency.confidence_factors.high_similarity_count}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={4}>
                <Stack spacing={4} align="center">
                  <Text size="xs" color="dimmed">
                    Coverage
                  </Text>
                  <Text weight={600} size="lg">
                    {Math.round(transparency.confidence_factors.enrichment_coverage * 100)}%
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={4}>
                <Stack spacing={4} align="center">
                  <Text size="xs" color="dimmed">
                    Freshness
                  </Text>
                  <Text weight={600} size="lg">
                    {Math.round(transparency.confidence_factors.freshness_score * 100)}%
                  </Text>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Low Confidence Warning */}
        {confidence < 0.7 && (
          <Alert
            color="yellow"
            icon={<IconAlertTriangle size={16} />}
            title="Low Confidence Analysis"
            radius="md"
          >
            <Text size="sm">{transparency.confidence_factors.reasoning}</Text>
            <Text size="xs" color="dimmed" mt={4}>
              This analysis may be less reliable due to limited data or low similarity matches.
              Consider gathering more context or verifying the suggestions independently.
            </Text>
          </Alert>
        )}

        {/* Similar Issues Used */}
        {transparency.similar_issues.length > 0 && (
          <div>
            <Group spacing="xs" mb="sm">
              <ThemeIcon color="blue" variant="light" size="sm">
                <IconSearch size={14} />
              </ThemeIcon>
              <Text weight={600} size="sm">
                Similar Issues Analyzed ({transparency.similar_issues_count})
              </Text>
            </Group>
            <Stack spacing="xs">
              {transparency.similar_issues.map(issue => (
                <Card
                  key={issue.id}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/issues/${issue.id}`);
                    }
                  }}
                  aria-label={`Navigate to similar issue: ${issue.title}`}
                >
                  <Group position="apart" noWrap>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Group spacing={8} noWrap>
                        <Text
                          size="sm"
                          weight={500}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {issue.title}
                        </Text>
                        {issue.status === 'resolved' && (
                          <ThemeIcon color="green" size="xs" variant="light">
                            <IconCheck size={12} />
                          </ThemeIcon>
                        )}
                      </Group>
                      <Group spacing="xs" mt={4}>
                        <Text size="xs" color="dimmed">
                          #{issue.id}
                        </Text>
                        {issue.project && (
                          <>
                            <Text size="xs" color="dimmed">
                              •
                            </Text>
                            <Text size="xs" color="dimmed">
                              {issue.project}
                            </Text>
                          </>
                        )}
                      </Group>
                    </div>
                    <Group spacing={8} noWrap>
                      <Tooltip label={`${Math.round(issue.similarity * 100)}% similar`}>
                        <Badge
                          color={issue.similarity > 0.8 ? 'green' : 'blue'}
                          variant="light"
                          size="sm"
                        >
                          {Math.round(issue.similarity * 100)}%
                        </Badge>
                      </Tooltip>
                      <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </div>
        )}

        {/* Enrichment Data Used */}
        {transparency.enrichment_sources_used.length > 0 && (
          <div>
            <Group spacing="xs" mb="sm">
              <ThemeIcon color="violet" variant="light" size="sm">
                <IconDatabase size={14} />
              </ThemeIcon>
              <Text weight={600} size="sm">
                Context Data Used ({transparency.enrichment_sources_used.length})
              </Text>
            </Group>
            <Group spacing={8}>
              {transparency.enrichment_sources_used.map(source => {
                const isStale = transparency.enrichment_sources_stale.includes(source);
                return (
                  <Tooltip
                    key={source}
                    label={isStale ? 'Data may be outdated' : 'Fresh data'}
                    withArrow
                  >
                    <Badge
                      color={isStale ? 'yellow' : 'violet'}
                      variant="light"
                      size="md"
                      leftSection={
                        isStale ? <IconClock size={12} aria-hidden="true" /> : undefined
                      }
                    >
                      {formatSourceName(source)}
                    </Badge>
                  </Tooltip>
                );
              })}
            </Group>
          </div>
        )}

        {/* Analysis Details */}
        <Card withBorder p="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Stack spacing="xs">
            <Text weight={600} size="sm">
              Analysis Details
            </Text>
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Model:
              </Text>
              <Text size="sm" weight={500}>
                {transparency.model_info.name}
              </Text>
            </Group>
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Provider:
              </Text>
              <Text size="sm" weight={500}>
                {transparency.model_info.provider}
              </Text>
            </Group>
            {transparency.model_info.version && (
              <Group position="apart">
                <Text size="sm" color="dimmed">
                  Version:
                </Text>
                <Text size="sm" weight={500}>
                  {transparency.model_info.version}
                </Text>
              </Group>
            )}
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Ranking:
              </Text>
              <Text size="sm" weight={500}>
                {transparency.ranking_variant}
              </Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}
