// frontend/src/components/KnowledgeBase/ClusterView.tsx

/**
 * Error Cluster Visualization Component
 *
 * Displays error clusters identified through community detection:
 * - Overview of all clusters with statistics
 * - Cluster type indicators (recurring, similar, outlier)
 * - Expandable cluster details with member issues
 * - Similar error search functionality
 */

import { useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Badge,
  Stack,
  SimpleGrid,
  Skeleton,
  Alert,
  Accordion,
  Code,
  Progress,
  ThemeIcon,
  TextInput,
  Button,
  Table,
  Tooltip,
  Box,
  Slider,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconHierarchy2,
  IconRepeat,
  IconCopy,
  IconQuestionMark,
  IconSearch,
  IconRefresh,
} from '@tabler/icons-react';
import {
  useClustering,
  useClusterIssues,
  type ClusterSummary,
} from '../../api/unified/hooks/useKnowledgeBase';

interface ClusterViewProps {
  onIssueClick?: (issueId: number) => void;
}

export function ClusterView({ onIssueClick }: ClusterViewProps) {
  // State for clustering parameters
  const [threshold, setThreshold] = useState(0.7);
  const [minSize, setMinSize] = useState(2);
  const [searchErrorType, setSearchErrorType] = useState('');
  const [searchErrorMessage, setSearchErrorMessage] = useState('');
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);

  // Fetch clusters
  const {
    clusters,
    totalClusters,
    totalItems,
    recurringClusters,
    similarClusters,
    outliers,
    isLoading,
    error,
    refetch,
    findSimilar,
    isFindingSimilar,
    similarResults,
  } = useClustering({ threshold, min_size: minSize });

  // Fetch cluster details when expanded
  const { data: clusterDetail, isLoading: isLoadingDetail } = useClusterIssues(
    expandedCluster ?? -1,
    { enabled: expandedCluster !== null, threshold, min_size: minSize }
  );

  const handleFindSimilar = () => {
    if (searchErrorType && searchErrorMessage) {
      findSimilar({
        errorType: searchErrorType,
        errorMessage: searchErrorMessage,
        options: { top_k: 10, min_score: 0.5 },
      });
    }
  };

  const getClusterIcon = (type: string) => {
    switch (type) {
      case 'recurring':
        return IconRepeat;
      case 'similar':
        return IconCopy;
      case 'outlier':
        return IconQuestionMark;
      default:
        return IconHierarchy2;
    }
  };

  const getClusterColor = (type: string) => {
    switch (type) {
      case 'recurring':
        return 'red';
      case 'similar':
        return 'blue';
      case 'outlier':
        return 'gray';
      default:
        return 'violet';
    }
  };

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error loading clusters" color="red">
        {error instanceof Error ? error.message : 'Failed to load error clusters'}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Controls */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={500}>Clustering Parameters</Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Box>
            <Text size="sm" mb="xs">
              Similarity Threshold: {threshold.toFixed(2)}
            </Text>
            <Slider
              value={threshold}
              onChange={setThreshold}
              min={0.3}
              max={0.95}
              step={0.05}
              marks={[
                { value: 0.5, label: '0.5' },
                { value: 0.7, label: '0.7' },
                { value: 0.9, label: '0.9' },
              ]}
            />
          </Box>
          <Box>
            <Text size="sm" mb="xs">
              Minimum Cluster Size: {minSize}
            </Text>
            <Slider
              value={minSize}
              onChange={setMinSize}
              min={2}
              max={10}
              step={1}
              marks={[
                { value: 2, label: '2' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
            />
          </Box>
        </SimpleGrid>
      </Paper>

      {/* Statistics */}
      {isLoading ? (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Paper withBorder p="md" radius="md">
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                <IconHierarchy2 size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Clusters
                </Text>
                <Text size="xl" fw={700}>
                  {totalClusters}
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color="red">
                <IconRepeat size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Recurring
                </Text>
                <Text size="xl" fw={700}>
                  {recurringClusters}
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <IconCopy size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Similar
                </Text>
                <Text size="xl" fw={700}>
                  {similarClusters}
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color="gray">
                <IconQuestionMark size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Outliers
                </Text>
                <Text size="xl" fw={700}>
                  {outliers}
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* Similar Error Search */}
      <Paper withBorder p="md" radius="md">
        <Text fw={500} mb="md">
          Find Similar Errors
        </Text>
        <Group align="flex-end">
          <TextInput
            label="Error Type"
            placeholder="e.g., TypeError"
            value={searchErrorType}
            onChange={(e) => setSearchErrorType(e.target.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            label="Error Message"
            placeholder="e.g., Cannot read property..."
            value={searchErrorMessage}
            onChange={(e) => setSearchErrorMessage(e.target.value)}
            style={{ flex: 2 }}
          />
          <Button
            leftSection={<IconSearch size={16} />}
            onClick={handleFindSimilar}
            loading={isFindingSimilar}
            disabled={!searchErrorType || !searchErrorMessage}
          >
            Search
          </Button>
        </Group>

        {/* Similar Results */}
        {similarResults && (
          <Box mt="md">
            <Text size="sm" c="dimmed" mb="xs">
              Found {similarResults.similar_count} similar errors
            </Text>
            {similarResults.similar_issues.length > 0 && (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Error Type</Table.Th>
                    <Table.Th>Message</Table.Th>
                    <Table.Th>Similarity</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {similarResults.similar_issues.map((issue) => (
                    <Table.Tr
                      key={issue.id}
                      style={{ cursor: onIssueClick ? 'pointer' : 'default' }}
                      onClick={() => onIssueClick?.(issue.id)}
                    >
                      <Table.Td>
                        <Code>{issue.error_type}</Code>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 300 }}>
                        <Text size="sm" truncate>
                          {issue.error_message}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            issue.similarity_score > 0.8
                              ? 'green'
                              : issue.similarity_score > 0.6
                                ? 'yellow'
                                : 'gray'
                          }
                          variant="light"
                        >
                          {(issue.similarity_score * 100).toFixed(0)}%
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {issue.is_validated && (
                            <Badge size="xs" color="green" variant="light">
                              Validated
                            </Badge>
                          )}
                          {issue.has_solution && (
                            <Badge size="xs" color="blue" variant="light">
                              Has Solution
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Box>
        )}
      </Paper>

      {/* Cluster List */}
      <Paper withBorder radius="md">
        <Text fw={500} p="md" pb={0}>
          Error Clusters ({totalItems} issues in {totalClusters} clusters)
        </Text>

        {isLoading ? (
          <Stack gap="sm" p="md">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={60} radius="sm" />
            ))}
          </Stack>
        ) : clusters.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No clusters found. Adjust parameters or add more issues to the knowledge base.
          </Text>
        ) : (
          <Accordion
            value={expandedCluster?.toString() ?? null}
            onChange={(value) => setExpandedCluster(value ? parseInt(value) : null)}
          >
            {clusters.map((cluster: ClusterSummary) => {
              const ClusterIcon = getClusterIcon(cluster.cluster_type);
              const color = getClusterColor(cluster.cluster_type);

              return (
                <Accordion.Item key={cluster.cluster_id} value={cluster.cluster_id.toString()}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm">
                        <ThemeIcon size="sm" radius="sm" variant="light" color={color}>
                          <ClusterIcon size={14} />
                        </ThemeIcon>
                        <div>
                          <Text size="sm" fw={500}>
                            {cluster.representative_error}
                          </Text>
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 400 }}>
                            {cluster.representative_message}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <Badge size="sm" variant="light" color={color}>
                          {cluster.cluster_type}
                        </Badge>
                        <Badge size="sm" variant="outline">
                          {cluster.size} issues
                        </Badge>
                        <Tooltip label={`Cohesion: ${(cluster.cohesion * 100).toFixed(0)}%`}>
                          <Box w={60}>
                            <Progress value={cluster.cohesion * 100} size="sm" color={color} />
                          </Box>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {isLoadingDetail && expandedCluster === cluster.cluster_id ? (
                      <Stack gap="xs">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} height={40} radius="sm" />
                        ))}
                      </Stack>
                    ) : clusterDetail && expandedCluster === cluster.cluster_id ? (
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Error Type</Table.Th>
                            <Table.Th>Message</Table.Th>
                            <Table.Th>Platform</Table.Th>
                            <Table.Th>Status</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {clusterDetail.issues.map((issue) => (
                            <Table.Tr
                              key={issue.id}
                              style={{ cursor: onIssueClick ? 'pointer' : 'default' }}
                              onClick={() => onIssueClick?.(issue.id)}
                            >
                              <Table.Td>
                                <Group gap="xs">
                                  <Code>{issue.error_type}</Code>
                                  {issue.is_representative && (
                                    <Badge size="xs" color="violet" variant="light">
                                      Representative
                                    </Badge>
                                  )}
                                </Group>
                              </Table.Td>
                              <Table.Td style={{ maxWidth: 300 }}>
                                <Text size="sm" truncate>
                                  {issue.error_message}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge size="sm" variant="light">
                                  {issue.platform || 'unknown'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Badge
                                    size="xs"
                                    color={issue.is_useful ? 'green' : 'gray'}
                                    variant="light"
                                  >
                                    {issue.is_useful ? 'Validated' : 'Pending'}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {issue.feedback_count} feedback
                                  </Text>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Click to load cluster details
                      </Text>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </Paper>
    </Stack>
  );
}

export default ClusterView;
