/**
 * RAGContextDrawer Component
 *
 * Shows the RAG context that was used to generate AI analysis
 */

import {
  Drawer,
  Stack,
  Title,
  Text,
  Badge,
  Group,
  Accordion,
  Code,
  Paper,
  Divider,
  Table,
} from '@mantine/core';
import { IconBrain, IconDatabase, IconSearch, IconSettings } from '@tabler/icons-react';
import { RAGContext } from '../../types/enrichment';

interface RAGContextDrawerProps {
  opened: boolean;
  onClose: () => void;
  ragContext?: RAGContext;
}

export const RAGContextDrawer: React.FC<RAGContextDrawerProps> = ({
  opened,
  onClose,
  ragContext,
}) => {
  if (!ragContext) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size="xl"
        title={
          <Group gap="xs">
            <IconBrain size={20} />
            <Title order={4}>Why This Answer?</Title>
          </Group>
        }
      >
        <Text c="dimmed">No RAG context available for this analysis.</Text>
      </Drawer>
    );
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        <Group gap="xs">
          <IconBrain size={20} />
          <Title order={4}>Why This Answer?</Title>
        </Group>
      }
    >
      <Stack gap="lg">
        {/* Overview */}
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed" mb="xs">
            This AI analysis was generated using Retrieval-Augmented Generation (RAG). Here's what
            context was provided to the AI model to generate the response.
          </Text>
          <Group gap="xs">
            <Badge variant="light" size="sm">
              {ragContext.similarIssues.length} similar issues
            </Badge>
            <Badge variant="light" size="sm">
              {ragContext.enrichmentDataUsed.length} data sources
            </Badge>
          </Group>
        </Paper>

        <Divider />

        {/* Similar Issues */}
        <Stack gap="md">
          <Group gap="xs">
            <IconSearch size={18} />
            <Title order={5}>Similar Issues Used</Title>
          </Group>

          {ragContext.similarIssues.length === 0 ? (
            <Text size="sm" c="dimmed">
              No similar issues were found in the knowledge base.
            </Text>
          ) : (
            <Accordion variant="separated">
              {ragContext.similarIssues.map((issue, index) => (
                <Accordion.Item key={issue.id} value={issue.id}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={500} lineClamp={1}>
                        {issue.title}
                      </Text>
                      <Badge
                        color={issue.similarity > 0.8 ? 'green' : issue.similarity > 0.6 ? 'blue' : 'yellow'}
                        variant="light"
                        size="sm"
                      >
                        {Math.round(issue.similarity * 100)}% match
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {issue.description && (
                        <div>
                          <Text size="xs" fw={500} c="dimmed">
                            Description:
                          </Text>
                          <Text size="sm">{issue.description}</Text>
                        </div>
                      )}
                      {issue.resolution && (
                        <div>
                          <Text size="xs" fw={500} c="dimmed">
                            Resolution:
                          </Text>
                          <Text size="sm">{issue.resolution}</Text>
                        </div>
                      )}
                      <Group gap="xs">
                        <Badge size="xs" variant="light">
                          {issue.status}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Issue ID: {issue.id}
                        </Text>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Stack>

        <Divider />

        {/* Enrichment Context */}
        <Stack gap="md">
          <Group gap="xs">
            <IconDatabase size={18} />
            <Title order={5}>Enrichment Data Included</Title>
          </Group>

          {ragContext.enrichmentDataUsed.length === 0 ? (
            <Text size="sm" c="dimmed">
              No enrichment data was used in this analysis.
            </Text>
          ) : (
            <Stack gap="xs">
              {ragContext.enrichmentDataUsed.map((source, index) => (
                <Paper key={index} p="sm" withBorder>
                  <Group gap="xs">
                    <Badge variant="dot" size="sm">
                      {source.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>

        <Divider />

        {/* Query */}
        <Stack gap="md">
          <Group gap="xs">
            <IconSearch size={18} />
            <Title order={5}>Query Used</Title>
          </Group>

          <Code block style={{ whiteSpace: 'pre-wrap' }}>
            {ragContext.query}
          </Code>
        </Stack>

        <Divider />

        {/* Model Info */}
        <Stack gap="md">
          <Group gap="xs">
            <IconSettings size={18} />
            <Title order={5}>Model Configuration</Title>
          </Group>

          <Table striped withTableBorder>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={500}>Provider</Table.Td>
                <Table.Td>{ragContext.modelInfo.provider}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={500}>Model</Table.Td>
                <Table.Td>{ragContext.modelInfo.model}</Table.Td>
              </Table.Tr>
              {ragContext.modelInfo.temperature !== undefined && (
                <Table.Tr>
                  <Table.Td fw={500}>Temperature</Table.Td>
                  <Table.Td>{ragContext.modelInfo.temperature}</Table.Td>
                </Table.Tr>
              )}
              {ragContext.modelInfo.maxTokens !== undefined && (
                <Table.Tr>
                  <Table.Td fw={500}>Max Tokens</Table.Td>
                  <Table.Td>{ragContext.modelInfo.maxTokens}</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Stack>

        <Divider />

        {/* Metadata */}
        <Text size="xs" c="dimmed">
          Retrieved at: {new Date(ragContext.retrievedAt).toLocaleString()}
        </Text>
      </Stack>
    </Drawer>
  );
};

export default RAGContextDrawer;
