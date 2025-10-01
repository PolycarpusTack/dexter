/**
 * N+1 Query Details Component
 * 
 * Displays detailed information about detected N+1 query patterns including
 * query groups, execution timeline, and performance metrics.
 */

import React from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  Badge,
  Timeline,
  Code,
  Paper,
  Accordion,
  Table,
  ScrollArea,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconDatabase,
  IconClock,
  IconAlertTriangle,
  IconInfoCircle,
  IconChevronRight,
} from '@tabler/icons-react';
import { N1QueryPattern, QueryGroup } from '../../types/analyzers';

interface N1QueryDetailsProps {
  pattern: N1QueryPattern;
  queryGroups: QueryGroup[];
}

export function N1QueryDetails({ pattern, queryGroups }: N1QueryDetailsProps) {
  const totalQueries = queryGroups.reduce((sum, group) => sum + group.queries.length, 0);
  const totalDuration = queryGroups.reduce(
    (sum, group) => sum + group.queries.reduce((gSum, q) => gSum + q.duration, 0),
    0
  );

  return (
    <Stack spacing="lg">
      {/* Overview Stats */}
      <Paper p="md" withBorder>
        <Group position="apart">
          <Box>
            <Text size="sm" color="dimmed">Total Queries</Text>
            <Text size="xl" weight={700}>{totalQueries}</Text>
          </Box>
          <Box>
            <Text size="sm" color="dimmed">Total Duration</Text>
            <Text size="xl" weight={700}>{totalDuration.toFixed(2)}ms</Text>
          </Box>
          <Box>
            <Text size="sm" color="dimmed">Pattern Type</Text>
            <Badge size="lg" color="orange" variant="filled">
              {pattern.pattern_type}
            </Badge>
          </Box>
          <Box>
            <Text size="sm" color="dimmed">Confidence</Text>
            <Badge
              size="lg"
              color={pattern.confidence > 0.8 ? 'red' : pattern.confidence > 0.6 ? 'orange' : 'yellow'}
              variant="filled"
            >
              {(pattern.confidence * 100).toFixed(0)}%
            </Badge>
          </Box>
        </Group>
      </Paper>

      {/* Query Pattern */}
      <Box>
        <Group mb="xs">
          <IconDatabase size={20} />
          <Text weight={600}>Query Pattern</Text>
        </Group>
        <Code block p="md">
          {pattern.parent_query || 'No parent query detected'}
        </Code>
      </Box>

      {/* Query Groups */}
      <Accordion variant="separated">
        {queryGroups.map((group, index) => (
          <Accordion.Item key={index} value={`group-${index}`}>
            <Accordion.Control>
              <Group position="apart">
                <Group>
                  <Badge color="blue" variant="light">
                    {group.pattern}
                  </Badge>
                  <Text size="sm">{group.queries.length} queries</Text>
                </Group>
                <Badge color="gray" variant="light">
                  {group.queries.reduce((sum, q) => sum + q.duration, 0).toFixed(2)}ms
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <ScrollArea>
                <Table fontSize="xs">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Duration</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.queries.map((query, qIndex) => (
                      <tr key={qIndex}>
                        <td>
                          <Tooltip label={query.query} multiline width={400}>
                            <Text size="xs" truncate style={{ maxWidth: 300 }}>
                              {query.query}
                            </Text>
                          </Tooltip>
                        </td>
                        <td>
                          <Badge size="sm" color="gray" variant="light">
                            {query.duration.toFixed(2)}ms
                          </Badge>
                        </td>
                        <td>
                          <Text size="xs" color="dimmed">
                            {new Date(query.timestamp).toLocaleTimeString()}
                          </Text>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {/* Timeline View */}
      <Box>
        <Group mb="xs">
          <IconClock size={20} />
          <Text weight={600}>Execution Timeline</Text>
        </Group>
        <Timeline active={queryGroups.length - 1} bulletSize={24} lineWidth={2}>
          {queryGroups.slice(0, 5).map((group, index) => (
            <Timeline.Item
              key={index}
              bullet={<IconDatabase size={12} />}
              title={`${group.pattern} (${group.queries.length} queries)`}
            >
              <Text color="dimmed" size="sm">
                {group.queries.reduce((sum, q) => sum + q.duration, 0).toFixed(2)}ms total
              </Text>
              <Text size="xs" color="dimmed">
                {new Date(group.queries[0]?.timestamp).toLocaleTimeString()}
              </Text>
            </Timeline.Item>
          ))}
          {queryGroups.length > 5 && (
            <Timeline.Item bullet={<IconChevronRight size={12} />} title="...">
              <Text size="sm" color="dimmed">
                {queryGroups.length - 5} more query groups
              </Text>
            </Timeline.Item>
          )}
        </Timeline>
      </Box>

      {/* Additional Context */}
      {pattern.context && (
        <Box>
          <Group mb="xs">
            <IconInfoCircle size={20} />
            <Text weight={600}>Additional Context</Text>
          </Group>
          <Paper p="md" withBorder>
            <Stack spacing="xs">
              {pattern.context.framework && (
                <Group>
                  <Text size="sm" color="dimmed">Framework:</Text>
                  <Badge>{pattern.context.framework}</Badge>
                </Group>
              )}
              {pattern.context.model && (
                <Group>
                  <Text size="sm" color="dimmed">Model:</Text>
                  <Code>{pattern.context.model}</Code>
                </Group>
              )}
              {pattern.context.relationship && (
                <Group>
                  <Text size="sm" color="dimmed">Relationship:</Text>
                  <Code>{pattern.context.relationship}</Code>
                </Group>
              )}
            </Stack>
          </Paper>
        </Box>
      )}
    </Stack>
  );
}