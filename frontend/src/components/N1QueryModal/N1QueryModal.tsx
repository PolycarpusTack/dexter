// File: frontend/src/components/N1QueryModal/N1QueryModal.tsx

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Text,
  Group,
  Stack,
  Badge,
  Code,
  ScrollArea,
  Tabs,
  Paper,
  Title,
  Alert,
  List,
  ThemeIcon,
  Accordion,
  CopyButton,
  Tooltip,
  ActionIcon,
  Divider,
  Progress,
  Table,
  Card
} from '@mantine/core';
import {
  IconDatabase,
  IconCode,
  IconBulb,
  IconChartLine,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconArrowsDownUp,
  IconClock,
  IconTrendingUp
} from '@tabler/icons-react';
import { N1QueryWaterfallVisualization } from './N1QueryWaterfallVisualization';
import { useN1QueryAnalysis } from '../../api/unified/hooks/useN1Query';
import type { AnalysisResult } from '../../types/analyzers';
import { N1QueryPattern, QueryGroup } from '../../types/analyzers';
import { AnalysisResult, AnalysisRecommendation } from '../../types/analyzers';

interface N1QueryModalProps {
  opened: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  eventData?: any;
  eventId?: string;
}

export const N1QueryModal: React.FC<N1QueryModalProps> = ({
  opened,
  onClose,
  analysis,
  eventData,
  eventId
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Use React Query hook for enhanced analysis if needed
  const { data: enhancedAnalysis, isLoading } = useN1QueryAnalysis(
    eventId,
    { 
      enabled: !!eventId && opened,
      useEnhancedAnalysis: true 
    }
  );

  const findings = analysis?.findings || [];
  const recommendations = analysis?.recommendations || [];
  const rawData = analysis?.raw_analysis_data || {};
  const visualizationData = analysis?.visualization_data || enhancedAnalysis?.analysis?.visualization_data;

  const queryPatterns = visualizationData?.data?.patterns || [];
  const totalQueries = rawData.total_queries || 0;
  const n1QueryCount = rawData.n1_queries_detected || queryPatterns.length;
  const performanceImpact = rawData.estimated_performance_impact || {};

  const confidenceColor = useMemo(() => {
    if (!analysis) return 'gray';
    if (analysis.confidence >= 0.7) return 'green';
    if (analysis.confidence >= 0.4) return 'yellow';
    return 'red';
  }, [analysis]);

  const impactColor = useMemo(() => {
    const impact = analysis?.business_impact;
    switch (impact) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  }, [analysis]);

  const calculateTotalSavings = () => {
    return queryPatterns.reduce((total: number, pattern: N1QueryPattern) => {
      return total + (pattern.total_time - pattern.optimized_time);
    }, 0);
  };

  if (!analysis && !enhancedAnalysis) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group>
          <ThemeIcon color="orange" size="lg" radius="md">
            <IconDatabase size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>N+1 Query Analysis</Text>
            <Text size="sm" color="dimmed">
              Database Query Pattern Detection
            </Text>
          </div>
        </Group>
      }
    >
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" icon={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="waterfall" icon={<IconChartLine size={16} />}>
            Query Waterfall
          </Tabs.Tab>
          <Tabs.Tab value="patterns" icon={<IconArrowsDownUp size={16} />}>
            Query Patterns ({queryPatterns.length})
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" icon={<IconBulb size={16} />}>
            Recommendations ({recommendations.length})
          </Tabs.Tab>
          <Tabs.Tab value="code" icon={<IconCode size={16} />}>
            Query Details
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="xs">
          <Stack spacing="md">
            {/* Metrics */}
            <Group position="apart">
              <Badge color={confidenceColor} size="lg" variant="light">
                Confidence: {((analysis?.confidence || 0) * 100).toFixed(0)}%
              </Badge>
              <Badge color={impactColor} size="lg" variant="light">
                Impact: {analysis?.business_impact || 'unknown'}
              </Badge>
              <Badge color="orange" size="lg" variant="light">
                N+1 Queries: {n1QueryCount}
              </Badge>
            </Group>

            {/* Summary Alert */}
            <Alert 
              icon={<IconDatabase size={16} />} 
              title="Analysis Summary" 
              color="orange"
              variant="light"
            >
              <Text size="sm">
                Detected {n1QueryCount} N+1 query pattern{n1QueryCount !== 1 ? 's' : ''} 
                {totalQueries > 0 && ` out of ${totalQueries} total queries`}.
                {performanceImpact.estimated_time_saved && 
                  ` Optimizing these queries could save approximately ${performanceImpact.estimated_time_saved}ms.`}
              </Text>
            </Alert>

            {/* Performance Impact */}
            <Paper p="md" withBorder>
              <Title order={6} mb="md">Performance Impact</Title>
              <Stack spacing="xs">
                <Group position="apart">
                  <Text size="sm">Current Query Time:</Text>
                  <Text size="sm" weight={600}>
                    {performanceImpact.current_time || calculateTotalSavings() + (performanceImpact.optimized_time || 0)}ms
                  </Text>
                </Group>
                <Group position="apart">
                  <Text size="sm">Optimized Time:</Text>
                  <Text size="sm" weight={600} color="green">
                    {performanceImpact.optimized_time || queryPatterns.reduce((t: number, p: any) => t + p.optimized_time, 0)}ms
                  </Text>
                </Group>
                <Divider my="xs" />
                <Group position="apart">
                  <Text size="sm" weight={600}>Potential Savings:</Text>
                  <Badge color="green" size="lg">
                    {calculateTotalSavings()}ms ({((calculateTotalSavings() / (performanceImpact.current_time || 1)) * 100).toFixed(1)}%)
                  </Badge>
                </Group>
              </Stack>
            </Paper>

            {/* Database Info */}
            {rawData.database_info && (
              <Paper p="md" withBorder>
                <Title order={6} mb="xs">Database Information</Title>
                <List spacing="xs" size="sm">
                  {rawData.database_info.engine && (
                    <List.Item>Engine: {rawData.database_info.engine}</List.Item>
                  )}
                  {rawData.database_info.tables_involved && (
                    <List.Item>
                      Tables Involved: {rawData.database_info.tables_involved.join(', ')}
                    </List.Item>
                  )}
                  {rawData.database_info.orm && (
                    <List.Item>ORM: {rawData.database_info.orm}</List.Item>
                  )}
                </List>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="waterfall" pt="xs">
          {visualizationData ? (
            <N1QueryWaterfallVisualization data={visualizationData} />
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="gray">
              {isLoading ? 'Loading visualization data...' : 'No visualization data available'}
            </Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="patterns" pt="xs">
          <Stack spacing="md">
            {queryPatterns.length > 0 ? (
              queryPatterns.map((pattern: N1QueryPattern, index: number) => (
                <Card key={pattern.id || index} p="md" withBorder>
                  <Stack spacing="sm">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon color="orange" size="sm">
                          <IconArrowsDownUp size={16} />
                        </ThemeIcon>
                        <Text weight={600}>Pattern #{index + 1}</Text>
                      </Group>
                      <Badge color="orange" variant="light">
                        {pattern.child_count} child queries
                      </Badge>
                    </Group>

                    <div>
                      <Text size="sm" weight={600} mb="xs">Parent Query:</Text>
                      <Code block>{pattern.parent_query}</Code>
                    </div>

                    {pattern.child_queries && pattern.child_queries.length > 0 && (
                      <div>
                        <Text size="sm" weight={600} mb="xs">Child Queries:</Text>
                        <Accordion>
                          {pattern.child_queries.slice(0, 5).map((childQuery: string, childIndex: number) => (
                            <Accordion.Item key={childIndex} value={`child-${index}-${childIndex}`}>
                              <Accordion.Control>
                                <Text size="sm">Child Query {childIndex + 1}</Text>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Code block>{childQuery}</Code>
                              </Accordion.Panel>
                            </Accordion.Item>
                          ))}
                          {pattern.child_queries.length > 5 && (
                            <Text size="xs" color="dimmed" mt="xs">
                              And {pattern.child_queries.length - 5} more...
                            </Text>
                          )}
                        </Accordion>
                      </div>
                    )}

                    <Paper p="sm" withBorder>
                      <Group position="apart">
                        <Group spacing="xl">
                          <div>
                            <Text size="xs" color="dimmed">Current Time</Text>
                            <Text size="sm" weight={600}>{pattern.total_time}ms</Text>
                          </div>
                          <div>
                            <Text size="xs" color="dimmed">Optimized Time</Text>
                            <Text size="sm" weight={600} color="green">{pattern.optimized_time}ms</Text>
                          </div>
                        </Group>
                        <Badge color="green" size="lg">
                          {pattern.savings_percentage.toFixed(1)}% faster
                        </Badge>
                      </Group>
                    </Paper>
                  </Stack>
                </Card>
              ))
            ) : (
              <Alert icon={<IconInfoCircle size={16} />} color="gray">
                No N+1 query patterns detected
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="recommendations" pt="xs">
          <Accordion>
            {recommendations.map((rec, index) => (
              <Accordion.Item key={index} value={`rec-${index}`}>
                <Accordion.Control>
                  <Group>
                    <Text weight={600}>{rec.title}</Text>
                    {rec.effort_estimate && (
                      <Badge size="sm" color="blue" variant="light">
                        {rec.effort_estimate}
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="md">
                    <Text size="sm">{rec.description}</Text>
                    
                    {rec.code_example && (
                      <div>
                        <Group position="apart" mb="xs">
                          <Text size="sm" weight={600}>Example Code:</Text>
                          <CopyButton value={rec.code_example}>
                            {({ copied, copy }) => (
                              <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                <ActionIcon 
                                  color={copied ? 'teal' : 'gray'} 
                                  onClick={copy}
                                  size="sm"
                                >
                                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        </Group>
                        <ScrollArea>
                          <Code block>{rec.code_example}</Code>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {rec.documentation_links && rec.documentation_links.length > 0 && (
                      <div>
                        <Text size="sm" weight={600} mb="xs">Documentation:</Text>
                        <List size="sm">
                          {rec.documentation_links.map((link, linkIndex) => (
                            <List.Item key={linkIndex}>
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                {link}
                              </a>
                            </List.Item>
                          ))}
                        </List>
                      </div>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Tabs.Panel>

        <Tabs.Panel value="code" pt="xs">
          <Stack spacing="md">
            {/* Query Execution Details */}
            {rawData.query_details && rawData.query_details.length > 0 ? (
              <div>
                <Title order={6} mb="md">Query Execution Details</Title>
                <ScrollArea>
                  <Table>
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th>Table</th>
                        <th>Execution Time</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.query_details.map((query: any, index: number) => (
                        <tr key={index}>
                          <td>
                            <Code block style={{ maxWidth: 400 }}>
                              {query.sql || query.query}
                            </Code>
                          </td>
                          <td>{query.table}</td>
                          <td>{query.execution_time}ms</td>
                          <td>{query.execution_count || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <Alert icon={<IconInfoCircle size={16} />} color="gray">
                No detailed query information available
              </Alert>
            )}

            {/* Stack Trace */}
            {eventData?.stacktrace?.frames && (
              <div>
                <Title order={6} mb="md">Stack Trace</Title>
                <ScrollArea style={{ height: 300 }}>
                  <Code block>
                    {eventData.stacktrace.frames
                      .slice()
                      .reverse()
                      .map((frame: any, index: number) => {
                        const parts = [];
                        if (frame.function) parts.push(`at ${frame.function}`);
                        if (frame.filename) {
                          parts.push(`(${frame.filename}:${frame.lineno || '?'}:${frame.colno || '?'})`);
                        }
                        return `  ${parts.join(' ')}`;
                      })
                      .join('\n')}
                  </Code>
                </ScrollArea>
              </div>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};