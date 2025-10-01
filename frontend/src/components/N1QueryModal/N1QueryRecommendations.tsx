/**
 * N+1 Query Recommendations Component
 * 
 * Displays AI-generated and rule-based recommendations for fixing N+1 query patterns,
 * including code examples and implementation guidance.
 */

import React from 'react';
import {
  Box,
  Stack,
  Text,
  Badge,
  Paper,
  Group,
  Alert,
  Code,
  Tabs,
  Button,
  Accordion,
  List,
  ThemeIcon,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBulb,
  IconCode,
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconBook,
  IconRocket,
} from '@tabler/icons-react';
import { AnalysisRecommendation } from '../../types/analyzers';

interface N1QueryRecommendationsProps {
  recommendations: AnalysisRecommendation[];
  framework?: string;
  modelName?: string;
}

export function N1QueryRecommendations({
  recommendations,
  framework,
  modelName,
}: N1QueryRecommendationsProps) {
  // Group recommendations by priority
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');

  const renderRecommendation = (rec: AnalysisRecommendation, index: number) => (
    <Paper key={index} p="md" withBorder>
      <Stack spacing="md">
        <Group position="apart">
          <Group>
            <ThemeIcon
              size="lg"
              color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}
              variant="light"
            >
              <IconBulb size={20} />
            </ThemeIcon>
            <Box>
              <Text weight={600}>{rec.title}</Text>
              <Badge
                size="sm"
                color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}
              >
                {rec.priority} priority
              </Badge>
            </Box>
          </Group>
          {rec.implementation_effort && (
            <Badge variant="dot" color="gray">
              {rec.implementation_effort} effort
            </Badge>
          )}
        </Group>

        <Text size="sm" color="dimmed">
          {rec.description}
        </Text>

        {rec.code_example && (
          <Box>
            <Group position="apart" mb="xs">
              <Text size="sm" weight={600}>Implementation Example:</Text>
              <CopyButton value={rec.code_example}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy code'}>
                    <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
            <Code block>{rec.code_example}</Code>
          </Box>
        )}

        {rec.benefits && rec.benefits.length > 0 && (
          <Box>
            <Text size="sm" weight={600} mb="xs">Expected Benefits:</Text>
            <List size="sm" spacing="xs">
              {rec.benefits.map((benefit, i) => (
                <List.Item
                  key={i}
                  icon={
                    <ThemeIcon color="green" size={20} radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {benefit}
                </List.Item>
              ))}
            </List>
          </Box>
        )}

        {rec.references && rec.references.length > 0 && (
          <Group spacing="xs">
            <IconBook size={16} />
            <Text size="xs" color="dimmed">References:</Text>
            {rec.references.map((ref, i) => (
              <Button
                key={i}
                size="xs"
                variant="subtle"
                compact
                rightIcon={<IconExternalLink size={14} />}
                component="a"
                href={ref}
                target="_blank"
              >
                Docs
              </Button>
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );

  return (
    <Stack spacing="lg">
      {/* Quick Fix Alert */}
      {highPriority.length > 0 && (
        <Alert
          icon={<IconRocket />}
          title="Quick Fix Available"
          color="green"
        >
          <Text size="sm">
            We've identified a straightforward solution that can resolve this N+1 query issue.
            Implement the high-priority recommendation below for immediate performance improvement.
          </Text>
        </Alert>
      )}

      {/* Framework-specific Tips */}
      {framework && (
        <Paper p="md" withBorder>
          <Group>
            <IconCode size={20} />
            <Text weight={600}>Framework-Specific Guidance</Text>
          </Group>
          <Text size="sm" color="dimmed" mt="xs">
            {framework === 'django' && (
              <>
                Use Django's <Code>select_related()</Code> for foreign key relationships and{' '}
                <Code>prefetch_related()</Code> for many-to-many or reverse foreign key lookups.
              </>
            )}
            {framework === 'sqlalchemy' && (
              <>
                Use SQLAlchemy's <Code>joinedload()</Code> or <Code>selectinload()</Code> options
                to eagerly load related objects.
              </>
            )}
            {framework === 'rails' && (
              <>
                Use Rails' <Code>includes()</Code>, <Code>preload()</Code>, or{' '}
                <Code>eager_load()</Code> methods to avoid N+1 queries.
              </>
            )}
            {!['django', 'sqlalchemy', 'rails'].includes(framework) && (
              <>
                Consider using your ORM's eager loading capabilities or implementing a custom
                batch loading solution.
              </>
            )}
          </Text>
        </Paper>
      )}

      {/* Recommendations by Priority */}
      <Tabs defaultValue="all">
        <Tabs.List>
          <Tabs.Tab value="all">All ({recommendations.length})</Tabs.Tab>
          {highPriority.length > 0 && (
            <Tabs.Tab value="high" color="red">
              High ({highPriority.length})
            </Tabs.Tab>
          )}
          {mediumPriority.length > 0 && (
            <Tabs.Tab value="medium" color="orange">
              Medium ({mediumPriority.length})
            </Tabs.Tab>
          )}
          {lowPriority.length > 0 && (
            <Tabs.Tab value="low" color="blue">
              Low ({lowPriority.length})
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="all" pt="lg">
          <Stack spacing="md">
            {recommendations.map(renderRecommendation)}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="high" pt="lg">
          <Stack spacing="md">
            {highPriority.map(renderRecommendation)}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="medium" pt="lg">
          <Stack spacing="md">
            {mediumPriority.map(renderRecommendation)}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="low" pt="lg">
          <Stack spacing="md">
            {lowPriority.map(renderRecommendation)}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* General Best Practices */}
      <Accordion variant="contained">
        <Accordion.Item value="best-practices">
          <Accordion.Control icon={<IconBook size={20} />}>
            Best Practices for Avoiding N+1 Queries
          </Accordion.Control>
          <Accordion.Panel>
            <List spacing="sm" size="sm">
              <List.Item>
                <Text weight={600}>Use Eager Loading:</Text>
                <Text size="sm" color="dimmed">
                  Load related data in the initial query instead of making separate queries for each item.
                </Text>
              </List.Item>
              <List.Item>
                <Text weight={600}>Implement DataLoader Pattern:</Text>
                <Text size="sm" color="dimmed">
                  Batch and cache database requests to minimize round trips.
                </Text>
              </List.Item>
              <List.Item>
                <Text weight={600}>Monitor Query Performance:</Text>
                <Text size="sm" color="dimmed">
                  Use query logging and APM tools to catch N+1 issues early in development.
                </Text>
              </List.Item>
              <List.Item>
                <Text weight={600}>Write Integration Tests:</Text>
                <Text size="sm" color="dimmed">
                  Test database query counts to prevent regression of N+1 issues.
                </Text>
              </List.Item>
              <List.Item>
                <Text weight={600}>Consider GraphQL:</Text>
                <Text size="sm" color="dimmed">
                  GraphQL's declarative data fetching can help prevent N+1 queries with proper resolvers.
                </Text>
              </List.Item>
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}