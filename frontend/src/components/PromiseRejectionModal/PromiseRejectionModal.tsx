// File: frontend/src/components/PromiseRejectionModal/PromiseRejectionModal.tsx

import React, { useMemo } from 'react';
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
  Divider
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCode,
  IconBulb,
  IconChartDots,
  IconCopy,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconAlertTriangle
} from '@tabler/icons-react';
import { PromiseFlowVisualization } from './PromiseFlowVisualization';
import type { AnalysisResult } from '../../types/analyzers';

interface PromiseRejectionModalProps {
  opened: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  eventData?: any;
}

export const PromiseRejectionModal: React.FC<PromiseRejectionModalProps> = ({
  opened,
  onClose,
  analysis,
  eventData
}) => {
  const findings = analysis?.findings || [];
  const recommendations = analysis?.recommendations || [];
  const rawData = analysis?.raw_analysis_data || {};
  const visualizationData = analysis?.visualization_data;

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

  if (!analysis) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group>
          <ThemeIcon color="red" size="lg" radius="md">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>Promise Rejection Analysis</Text>
            <Text size="sm" color="dimmed">
              {rawData.rejection_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </div>
        </Group>
      }
    >
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" icon={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="visualization" icon={<IconChartDots size={16} />}>
            Promise Flow
          </Tabs.Tab>
          <Tabs.Tab value="findings" icon={<IconAlertTriangle size={16} />}>
            Findings ({findings.length})
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" icon={<IconBulb size={16} />}>
            Recommendations ({recommendations.length})
          </Tabs.Tab>
          <Tabs.Tab value="code" icon={<IconCode size={16} />}>
            Stack Trace
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="xs">
          <Stack spacing="md">
            {/* Metrics */}
            <Group position="apart">
              <Badge color={confidenceColor} size="lg" variant="light">
                Confidence: {(analysis.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge color={impactColor} size="lg" variant="light">
                Impact: {analysis.business_impact}
              </Badge>
              {rawData.framework && (
                <Badge color="blue" size="lg" variant="light">
                  Framework: {rawData.framework}
                </Badge>
              )}
            </Group>

            {/* Summary Alert */}
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              title="Analysis Summary" 
              color="red"
              variant="light"
            >
              <Text size="sm">
                Detected {rawData.rejection_type === 'unhandled' ? 'an unhandled' : 'a'} promise rejection
                {rawData.framework && ` in ${rawData.framework} application`}.
                {rawData.async_depth > 0 && ` The async call chain has ${rawData.async_depth} levels.`}
              </Text>
            </Alert>

            {/* Detected Patterns */}
            {rawData.patterns_detected && Object.keys(rawData.patterns_detected).length > 0 && (
              <Paper p="md" withBorder>
                <Title order={6} mb="xs">Detected Patterns</Title>
                <List spacing="xs" size="sm">
                  {Object.entries(rawData.patterns_detected).map(([pattern, detected]) => (
                    detected && (
                      <List.Item
                        key={pattern}
                        icon={
                          <ThemeIcon color="orange" size={24} radius="xl">
                            <IconAlertTriangle size={16} />
                          </ThemeIcon>
                        }
                      >
                        {pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </List.Item>
                    )
                  ))}
                </List>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="visualization" pt="xs">
          {visualizationData ? (
            <PromiseFlowVisualization data={visualizationData} />
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="gray">
              No visualization data available
            </Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="findings" pt="xs">
          <Stack spacing="md">
            {findings.length > 0 ? (
              findings.map((finding, index) => (
                <Paper key={index} p="md" withBorder>
                  <Group position="apart" mb="xs">
                    <Text weight={600}>{finding.category}</Text>
                    <Badge color={impactColor} variant="light">
                      {finding.severity}
                    </Badge>
                  </Group>
                  <Text size="sm" color="dimmed" mb="xs">
                    {finding.description}
                  </Text>
                  {finding.location && (
                    <Code block>{finding.location}</Code>
                  )}
                </Paper>
              ))
            ) : (
              <Alert icon={<IconInfoCircle size={16} />} color="gray">
                No specific findings identified
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
            {eventData?.exception?.values?.[0]?.stacktrace?.frames ? (
              <ScrollArea style={{ height: 400 }}>
                <Code block>
                  {eventData.exception.values[0].stacktrace.frames
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
            ) : (
              <Alert icon={<IconInfoCircle size={16} />} color="gray">
                No stack trace available
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};