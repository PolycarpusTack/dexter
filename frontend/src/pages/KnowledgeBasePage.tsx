// frontend/src/pages/KnowledgeBasePage.tsx

/**
 * Knowledge Base Browser Page
 *
 * Allows users to:
 * - Search and browse past error issues
 * - Filter by validation status
 * - View issue details with solutions
 * - Provide feedback on solutions
 * - View error clusters (Phase 8)
 *
 * Accessibility:
 * - Keyboard navigation for table rows
 * - ARIA labels on all interactive elements
 * - Focus management for drawer
 */

import { useState, useCallback } from 'react';
import {
  Container,
  Title,
  TextInput,
  Table,
  Badge,
  Group,
  Pagination,
  Select,
  Drawer,
  Stack,
  Text,
  Code,
  Divider,
  ActionIcon,
  Tooltip,
  Paper,
  SimpleGrid,
  Skeleton,
  Alert,
  ThemeIcon,
  Box,
  Tabs,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconSearch,
  IconChevronRight,
  IconDatabase,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconBrain,
  IconRefresh,
  IconHierarchy2,
  IconList,
} from '@tabler/icons-react';
import {
  useKnowledgeBase,
  useKnowledgeBaseIssue,
  type KnowledgeBaseIssue,
  type KnowledgeBaseListParams,
} from '../api/unified/hooks/useKnowledgeBase';
import { FeedbackButtons } from '../components/Feedback/FeedbackButtons';
import { ClusterView } from '../components/KnowledgeBase/ClusterView';

type FilterType = 'all' | 'validated' | 'pending';

export function KnowledgeBasePage() {
  // State
  const [activeTab, setActiveTab] = useState<string | null>('browse');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  // Build query params
  const queryParams: KnowledgeBaseListParams = {
    search: debouncedSearch || undefined,
    page,
    limit: 20,
    filter: filter !== 'all' ? filter : undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  };

  // Fetch data
  const {
    issues,
    total,
    totalPages,
    stats,
    isRAGEnabled,
    isLoading,
    isLoadingStats,
    error,
    refetch,
  } = useKnowledgeBase(queryParams);

  // Fetch selected issue details
  const { data: selectedIssue, isLoading: isLoadingIssue } = useKnowledgeBaseIssue(
    selectedIssueId ?? 0,
    { enabled: selectedIssueId !== null && selectedIssueId > 0 }
  );

  // Handlers
  const handleRowClick = useCallback((issue: KnowledgeBaseIssue) => {
    setSelectedIssueId(issue.id);
  }, []);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, issue: KnowledgeBaseIssue) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectedIssueId(issue.id);
      }
    },
    []
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedIssueId(null);
  }, []);

  const handleFeedbackSubmitted = useCallback(() => {
    refetch();
  }, [refetch]);

  // Render stats cards
  const renderStats = () => {
    if (isLoadingStats) {
      return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
        </SimpleGrid>
      );
    }

    if (!stats) return null;

    const statItems = [
      {
        label: 'Total Issues',
        value: stats.total_issues,
        icon: IconDatabase,
        color: 'blue',
      },
      {
        label: 'Validated',
        value: stats.validated_issues,
        icon: IconCheck,
        color: 'green',
      },
      {
        label: 'Pending',
        value: stats.pending_issues,
        icon: IconClock,
        color: 'yellow',
      },
      {
        label: 'Total Feedback',
        value: stats.total_feedback,
        icon: IconBrain,
        color: 'violet',
      },
    ];

    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        {statItems.map((item) => (
          <Paper key={item.label} p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color={item.color}>
                <item.icon size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {item.label}
                </Text>
                <Text size="xl" fw={700}>
                  {item.value.toLocaleString()}
                </Text>
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    );
  };

  // Render error state
  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading knowledge base"
          color="red"
        >
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </Alert>
      </Container>
    );
  }

  // Handle clicking an issue from ClusterView
  const handleClusterIssueClick = useCallback((issueId: number) => {
    setSelectedIssueId(issueId);
  }, []);

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Knowledge Base</Title>
          <Text c="dimmed" size="sm">
            Browse and search past error solutions
            {isRAGEnabled && (
              <Badge ml="xs" size="xs" variant="light" color="green">
                RAG Enabled
              </Badge>
            )}
          </Text>
        </div>
        <Tooltip label="Refresh">
          <ActionIcon
            variant="subtle"
            onClick={() => refetch()}
            aria-label="Refresh knowledge base"
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Stats */}
      {renderStats()}

      {/* Tabs for Browse and Clusters */}
      <Tabs value={activeTab} onChange={setActiveTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="browse" leftSection={<IconList size={16} />}>
            Browse Issues
          </Tabs.Tab>
          <Tabs.Tab value="clusters" leftSection={<IconHierarchy2 size={16} />}>
            Error Clusters
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="browse" pt="md">
          {/* Filters */}
          <Group mb="md">
            <TextInput
              placeholder="Search errors..."
              leftSection={<IconSearch size={16} aria-hidden="true" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ flex: 1 }}
              aria-label="Search knowledge base"
            />
            <Select
              value={filter}
              onChange={(v) => {
                setFilter((v as FilterType) || 'all');
                setPage(1);
              }}
              data={[
                { value: 'all', label: 'All Issues' },
                { value: 'validated', label: 'Validated Only' },
                { value: 'pending', label: 'Needs Validation' },
              ]}
              aria-label="Filter by status"
              w={180}
            />
          </Group>

          {/* Table */}
          <Paper withBorder radius="md">
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Error Type</Table.Th>
                  <Table.Th>Message</Table.Th>
                  <Table.Th>Platform</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Feedback</Table.Th>
                  <Table.Th w={50}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Skeleton height={20} width={100} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={300} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={60} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={80} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={40} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={20} />
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : issues.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl">
                        {debouncedSearch
                          ? 'No issues found matching your search'
                          : 'No issues in the knowledge base yet'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  issues.map((issue) => (
                    <Table.Tr
                      key={issue.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(issue)}
                      tabIndex={0}
                      onKeyDown={(e) => handleRowKeyDown(e, issue)}
                      aria-label={`View details for ${issue.error_type}: ${issue.error_message.slice(0, 50)}`}
                    >
                      <Table.Td>
                        <Code>{issue.error_type}</Code>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 400 }}>
                        <Text size="sm" truncate>
                          {issue.error_message}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="sm">
                          {issue.platform || 'unknown'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={issue.is_useful ? 'green' : 'gray'}
                          variant="light"
                          aria-label={issue.is_useful ? 'Validated' : 'Pending validation'}
                        >
                          {issue.is_useful ? 'Validated' : 'Pending'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {issue.feedback_count}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="View details">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="View issue details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(issue);
                            }}
                          >
                            <IconChevronRight size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                aria-label="Page navigation"
              />
              <Text size="sm" c="dimmed">
                {total} total issues
              </Text>
            </Group>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="clusters" pt="md">
          <ClusterView onIssueClick={handleClusterIssueClick} />
        </Tabs.Panel>
      </Tabs>

      {/* Detail Drawer */}
      <Drawer
        opened={selectedIssueId !== null}
        onClose={handleCloseDrawer}
        title="Issue Details"
        position="right"
        size="lg"
        padding="lg"
      >
        {isLoadingIssue ? (
          <Stack gap="md">
            <Skeleton height={30} width={200} />
            <Skeleton height={60} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        ) : selectedIssue ? (
          <Stack gap="md">
            {/* Error Type */}
            <Box>
              <Text size="sm" c="dimmed" mb={4}>
                Error Type
              </Text>
              <Code fz="md">{selectedIssue.error_type}</Code>
            </Box>

            {/* Error Message */}
            <Box>
              <Text size="sm" c="dimmed" mb={4}>
                Message
              </Text>
              <Text style={{ wordBreak: 'break-word' }}>
                {selectedIssue.error_message}
              </Text>
            </Box>

            {/* Platform & Status */}
            <Group>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>
                  Platform
                </Text>
                <Badge variant="light">{selectedIssue.platform || 'unknown'}</Badge>
              </Box>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>
                  Status
                </Text>
                <Badge
                  color={selectedIssue.is_useful ? 'green' : 'gray'}
                  variant="light"
                >
                  {selectedIssue.is_useful ? 'Validated' : 'Pending'}
                </Badge>
              </Box>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>
                  Confidence
                </Text>
                <Badge
                  color={
                    selectedIssue.confidence_score > 0.7
                      ? 'green'
                      : selectedIssue.confidence_score > 0.4
                        ? 'yellow'
                        : 'gray'
                  }
                  variant="light"
                >
                  {Math.round(selectedIssue.confidence_score * 100)}%
                </Badge>
              </Box>
            </Group>

            <Divider />

            {/* Human Solution */}
            {selectedIssue.human_solution && (
              <Box>
                <Group gap="xs" mb={4}>
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm" c="dimmed">
                    Verified Solution
                  </Text>
                </Group>
                <Paper p="sm" bg="green.0" radius="sm">
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedIssue.human_solution}
                  </Text>
                </Paper>
              </Box>
            )}

            {/* AI Explanation */}
            {selectedIssue.ai_explanation && (
              <Box>
                <Group gap="xs" mb={4}>
                  <IconBrain size={16} color="var(--mantine-color-blue-6)" />
                  <Text size="sm" c="dimmed">
                    AI Explanation
                  </Text>
                </Group>
                <Paper p="sm" bg="gray.0" radius="sm">
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedIssue.ai_explanation}
                  </Text>
                </Paper>
              </Box>
            )}

            {/* AI Suggested Fix */}
            {selectedIssue.ai_suggested_fix && (
              <Box>
                <Text size="sm" c="dimmed" mb={4}>
                  Suggested Fix
                </Text>
                <Code block style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedIssue.ai_suggested_fix}
                </Code>
              </Box>
            )}

            <Divider />

            {/* Feedback */}
            <Box>
              <Text size="sm" c="dimmed" mb="xs">
                Was this helpful?
              </Text>
              <FeedbackButtons
                issueId={selectedIssue.id}
                onFeedbackSubmitted={handleFeedbackSubmitted}
                showStats
              />
            </Box>

            {/* Metadata */}
            <Box>
              <Text size="xs" c="dimmed">
                Created: {new Date(selectedIssue.created_at).toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Updated: {new Date(selectedIssue.updated_at).toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Feedback count: {selectedIssue.feedback_count}
              </Text>
            </Box>
          </Stack>
        ) : (
          <Text c="dimmed">Issue not found</Text>
        )}
      </Drawer>
    </Container>
  );
}

export default KnowledgeBasePage;
